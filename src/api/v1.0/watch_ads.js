const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const key = require('../../../config/keys')
const { insertActivity } = require("../../models/activities")
const { putActivity } = require("../../Auth/activity_middleware");
const { getBattleFromBattleId, updateUserLeague, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber, getUserAxPiByUserid, isCheckpointCrossed } = require('../../models');
const { response, responseError } = require('../../models/response');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { addWatchAddTrackerData, getWatchAddTrackerData, updateWatchAddTrackerDataTrue } = require('../../models/tracker');
const {addUserCoinsHistory, getUserCoinsHistory} = require("../../models/coins");
const watchAdsModel = require('../../db/modules/watch_ads');
const watch_ad_auth = require('../../Auth/watch_ad_auth');
const { WATCH_AD_LIMIT, AD_LIMIT_MIN } = require('../../../config/constants');
const {redis, deleteKeysByPrefix} = require('../../models/redis');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 5,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const watch_ad_limit = WATCH_AD_LIMIT

const ad_limit_min = AD_LIMIT_MIN

function subtractMin(numOfMin = ad_limit_min, date = new Date()) {
    date.setMinutes(date.getMinutes() - numOfMin);
    return date;
}

function timeDifference(date1,date2) {
    let difference = date1 - date2;

    let daysDifference = Math.floor(difference/1000/60/60/24);
    difference -= daysDifference*1000*60*60*24

    let hoursDifference = Math.floor(difference/1000/60/60);
    difference -= hoursDifference*1000*60*60

    let minutesDifference = Math.floor(difference/1000/60);
    difference -= minutesDifference*1000*60

    let secondsDifference = Math.floor(difference/1000);

    return {
        minutesDifference,
        secondsDifference
    }
}

router.get('/', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    let watch_ad_event_id = key.watch_ad_event_id
    if(req.query.watch_ad_event_id){
        watch_ad_event_id = req.query.watch_ad_event_id
    }
    const data = await getBattleFromBattleId(watch_ad_event_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "watch_ads",
            "Error occured in getBattleFromBattleId function",
            req.url,
            error)
        res.status(500).json(await responseError());
        })
    if(data){
        const result = subtractMin();
        const watch_ad_data = watchAdsModel.find({user_id: req.userData.user_id, ad_watched: true, timestamp: { $gte: result } })
        watch_ad_data.exec(async function (err, tarcker_data) {
            if(err){
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "watch_ad_data",
                    "Error occured in watchAdsModel function",
                    req.url,
                    err)
                    res.status(500).json(await responseError());
                }
            else{
                const watch_ad_count = tarcker_data.length
                if(watch_ad_count < watch_ad_limit){
                    res.status(200).json(await response({
                        instructions: data.data[0].instructions,
                        reward_type: data.data[0].rewardType,
                        reward: data.data[0].reward,
                        watch_ad: true,
                        watch_ad_message: "",
                        button_text: "Watch Ad",
                        minutes_remaning: 0,
                        seconds_remaining: 0
                    },
                        200, "Watch Ad data retrieved successfully"))
                }
                else{
                    let time_difference = timeDifference(tarcker_data[0]['timestamp'], new Date().getTime())
                    res.status(200).json(await response({
                        instructions: data.data[0].instructions,
                        reward_type: data.data[0].rewardType,
                        reward: data.data[0].reward,
                        watch_ad: false,
                        watch_ad_message: `Watch Ad limit exceeded. Please try after ${time_difference.minutesDifference} min`,
                        button_text: `Watch Ad and Earn ${data.data[0].reward} ${data.data[0].rewardType} in ${time_difference.minutesDifference} min`,
                        minutes_remaning: time_difference.minutesDifference,
                        seconds_remaining: time_difference.secondsDifference
                    },
                        200, "Watch Ad data retrieved successfully"))
                }
            }
        })
    }
})

router.get('/watch_ad_count', limiter, check_domain_middleware, jwtAuth, putActivity("watch ads", "Started watching ad"),  async (req, res) => {
    const addWatchAdData = await addWatchAddTrackerData({
        user_id: req.userData.user_id,
        timestamp: +new Date()
    }).catch(async err => {
        console.log(err)
        res.status(500).json(await responseError());
    })
    if(addWatchAdData){
        res.status(200).json(await response({tracker_id: addWatchAdData._id}, 200, `Watch Full video to earn AxPi`)) 
    }
})

router.get('/result', limiter, check_domain_middleware, jwtAuth, putActivity("watch ads", "Ad Watched"),  async (req, res) => {
    if(!req.query.tracker_id){
        res.status(400).json(await response({}, 405, "Not Allowed"))
    }
    else{
        let watch_ad_event_id = key.watch_ad_event_id
        if(req.query.watch_ad_event_id){
            watch_ad_event_id = req.query.watch_ad_event_id
        }
        const result = subtractMin();
        const old_axpi = await getUserAxPiByUserid(req.userData.user_id)
        const watch_ad_data = watchAdsModel.find({user_id: req.userData.user_id, ad_watched: true, timestamp: { $gte: result } }).count()
        watch_ad_data.exec(async function (err, watch_ad_count) {
            if(err){
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "watch_ad_data",
                    "Error occured in watchAdsModel function",
                    req.url,
                    err)
                    res.status(500).json(await responseError());
                }
            else{
                if(watch_ad_count < watch_ad_limit){
                    const tarcker_data = await getWatchAddTrackerData(req.query.tracker_id)
                    if(!tarcker_data['ad_watched']){
                        await updateWatchAddTrackerDataTrue(req.query.tracker_id);
                        const data = await getBattleFromBattleId(watch_ad_event_id).catch(async error => {
                            await insertActivity(
                                req.userData.username,
                                req.userData.user_id,
                                "Watch Ads",
                                "Error occured in getBattleFromBattleId function",
                                req.url,
                                error)
                            res.status(500).json(await responseError());
                            })
                        if(data){
                            const new_axpi = old_axpi + parseInt(data.data[0].reward)
                            let coin_data = {
                                module:"watch_ads",
                                battle_id: data.data[0].id,
                                battle_name: data.data[0].name,
                                battle_image: data.data[0].path,
                                user_id: req.userData.user_id,
                                entry_fee: data.data[0].entryFee,
                                entry_fee_type: data.data[0].entryFeeType,
                                reward_type: data.data[0].rewardType,
                                reward: data.data[0].reward,
                                coins: `+${data.data[0].reward}`,
                                description: `You earn ${data.data[0].reward} ${data.data[0].rewardType} for watching ad`,
                                timestamp: +new Date()
                            }
                            const coinUpdationParams = {
                                TableName: tableUser,
                                Key: { "type": key.userType, "id": req.userData.user_id },
                                UpdateExpression: "set coins = coins + :val, watch_ad_count = watch_ad_count + :val2",
                                ExpressionAttributeValues: { ":val": parseInt(data.data[0].reward), ":val2": 1 },
                                ReturnValues: "UPDATED_NEW"
                            }
                            docClient.update(coinUpdationParams, async function (coinUpdationErr, coinUpdationData) {
                                if (coinUpdationErr) {
                                    res.status(500).json(await responseError());
                                } else {
                                    const updateUserLeagueData = await updateUserLeague(req.userData.user_id, coinUpdationData.Attributes.coins).catch(async (updateUserLeagueError)=>{
                                        res.status(500).json(await responseError());
                                    })
                                    if(updateUserLeagueData){
                                        const updated = await addUserCoinsHistory(coin_data).catch(async (err)=>{
                                            res.status(500).json(await responseError());
                                        })
                                        if(updated){
                                            // Remove chache of coins
                                            await deleteKeysByPrefix('coins_history:')
                                            const cache_data2 = await redis.get(`withdraw:${req.userData.user_id}`);
                                            if(cache_data2) await redis.del(`withdraw:${req.userData.user_id}`)
                                            const cache_data3 = await redis.get(`home_v2:${req.userData.user_id}`)
                                            if(cache_data3) await redis.del(`home_v2:${req.userData.user_id}`)
                                            const cache_data4 = await redis.get(`user_details:${req.userData.user_id}`)
                                            if(cache_data4) await redis.del(`user_details:${req.userData.user_id}`)
                                            await updateUserStatsCount(req.userData.user_id, "watch_ad_count")
                                            await updateOverAllCount(`watch_ad_count`)
                                            await updateOverAllCount(`watch_ads.${new Date().getFullYear()}.count`)
                                            await updateOverAllCount(`watch_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                            await updateOverAllCount(`watch_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                            await updateOverAllCount(`watch_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                            const checkpoint_data = await isCheckpointCrossed(old_axpi, new_axpi, req.userData.user_id)
                                            return res.status(200).json(await response({}, 200, `Rewarded ${data.data[0].reward} ${data.data[0].rewardType}`, null, checkpoint_data))
                                        }
                                    }
                                }
                            })
                        }
                    }
                    else{
                        res.status(400).json(await response({}, 405, "Not Allowed"))
                    }
                }
                else{
                    res.status(400).json(await response({}, 400, `Limit of watching ad exceeded`))
                }
            }
        })
    }
})

module.exports = router;
