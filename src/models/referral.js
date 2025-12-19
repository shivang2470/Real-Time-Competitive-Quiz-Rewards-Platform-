const AWS = require('aws-sdk');
const {addUserCoinsHistory} = require("../models/coins");
const { updateUserLeague, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber } = require('../models');
const { addTrackerData } = require('../models/tracker');
const key = require('../../config/keys');
const {redis, deleteKeysByPrefix} = require('./redis');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const updateRefreeCoins = async (refree_code, username, user_id, event_data) => {
    const referralCodeCheckingParams = {
        TableName: tableUser,
        IndexName: 'type-referral_code-index',
        KeyConditionExpression: '#type = :hkey and referral_code = :referral_code',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':hkey': key.userType, ':referral_code': refree_code },
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(referralCodeCheckingParams, async function (referralCodeCheckingErr, referralCodeCheckingData) {
            if (referralCodeCheckingErr) {
                reject({status_code: 500, message: referralCodeCheckingErr})
            }
            else {
                if (referralCodeCheckingData.Items.length === 0) {
                    await insertActivity(
                        username,
                        user_id,
                        "register",
                        "Referral code not exists!",
                        "/register");
                    resolve({status_code: 404})
                }
                else {
                    const addReferralData = await addTrackerData({
                        user_id,
                        referral_code: refree_code,
                        referral_user_id: referralCodeCheckingData.Items[0].id,
                        timestamp: +new Date()
                    }).catch(async coinHistoryUpdate2Err => {
                        reject({status_code: 500, message: coinHistoryUpdate2Err})
                    })
                    if(addReferralData){
                        const coinUpdationParams = {
                            TableName: tableUser,
                            Key: { "type": key.userType, "id": referralCodeCheckingData.Items[0].id },
                            UpdateExpression: "set coins = coins + :val, referral_count = referral_count + :val2",
                            ExpressionAttributeValues: { ":val": parseInt(event_data.data[0].reward), ":val2": 1 },
                            ReturnValues: "UPDATED_NEW"
                        }
                        docClient.update(coinUpdationParams, async function (coinUpdationErr, coinUpdationData) {
                            if (coinUpdationErr) {
                                reject({status_code: 500, message: coinUpdationErr})
                            } else {
                                await updateUserStatsCount(user_id, "referral_count");
                                await updateOverAllCount(`referral_count`)
                                await updateOverAllCount(`referrals.${new Date().getFullYear()}.count`)
                                await updateOverAllCount(`referrals.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                await updateOverAllCount(`referrals.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                await updateOverAllCount(`referrals.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                const coinUpdationParams2 = {
                                    TableName: tableUser,
                                    Key: { "type": key.userType, "id": user_id },
                                    UpdateExpression: "set coins = coins + :val",
                                    ExpressionAttributeValues: { ":val": parseInt(event_data.data[0].reward) },
                                    ReturnValues: "UPDATED_NEW"
                                }
                                docClient.update(coinUpdationParams2, async function (coinUpdationErr2, coinUpdationData2) {
                                    if (coinUpdationErr2) {
                                        reject({status_code: 500, message: coinUpdationErr2})
                                    } else {
                                        const updateUserLeagueData = await updateUserLeague(referralCodeCheckingData.Items[0].id, coinUpdationData.Attributes.coins).catch(async (updateUserLeagueError)=>{
                                            reject({status_code: 500, message: updateUserLeagueError})
                                        })
                                        if(updateUserLeagueData){
                                            const coinHistoryUpdate1 = await addUserCoinsHistory({
                                                module:"referral",
                                                battle_id: event_data.data[0].id, 
                                                battle_name: event_data.data[0].name,
                                                battle_image: event_data.data[0].path,
                                                user_id: user_id,
                                                referral_id: addReferralData._id,
                                                entry_fee: event_data.data[0].entryFee,
                                                entry_fee_type: event_data.data[0].entryFeeType,
                                                reward_type: event_data.data[0].rewardType,
                                                reward: event_data.data[0].reward,
                                                coins: `+${event_data.data[0].reward}`,
                                                description: `You refered by ${referralCodeCheckingData.Items[0].username} and earned ${event_data.data[0].reward} ${event_data.data[0].rewardType}`,
                                                timestamp: +new Date()
                                            }).catch(async coinHistoryUpdate1Err => {
                                                reject({status_code: 500, message: coinHistoryUpdate1Err})
                                            })
                                            if(coinHistoryUpdate1){
                                                const coinHistoryUpdate2 = await addUserCoinsHistory({
                                                    module:"referral",
                                                    battle_id: event_data.data[0].id,
                                                    battle_name: event_data.data[0].name,
                                                    battle_image: event_data.data[0].path,
                                                    user_id: referralCodeCheckingData.Items[0].id,
                                                    referral_id: addReferralData._id,
                                                    entry_fee: event_data.data[0].entryFee,
                                                    entry_fee_type: event_data.data[0].entryFeeType,
                                                    reward_type: event_data.data[0].rewardType,
                                                    reward: event_data.data[0].reward,
                                                    coins: `+${event_data.data[0].reward}`,
                                                    description: `You refer ${username} and earned ${event_data.data[0].reward} ${event_data.data[0].rewardType}`,
                                                    timestamp: +new Date()
                                                }).catch(async coinHistoryUpdate2Err => {
                                                    reject({status_code: 500, message: coinHistoryUpdate2Err})
                                                })
                                                
                                            if(coinHistoryUpdate2){
                                                // Remove chache of coins
                                                await deleteKeysByPrefix('coins_history:')
                                                const cache_data2 = await redis.get(`withdraw:${user_id}`);
                                                if(cache_data2) await redis.del(`withdraw:${user_id}`)
                                                const cache_data3 = await redis.get(`home_v2:${user_id}`)
                                                if(cache_data3) await redis.del(`home_v2:${user_id}`)
                                                const cache_data4 = await redis.get(`user_details:${user_id}`)
                                                if(cache_data4) await redis.del(`user_details:${user_id}`)
                                                resolve("Success")
                                            }
                                        }
                                    }
                                }
                            })
                        }
                    })
                }
                }
            }
        })
    }))
}

module.exports = {updateRefreeCoins}