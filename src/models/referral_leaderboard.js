const AWS = require('aws-sdk');
const key = require('../../config/keys');
AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});
const referralModel = require('../db/modules/referrals');
const { getUserByUserId, updateUserLeague } = require('.');
const referralLeaderboardModel = require('../db/modules/referral_leaderboard');
const { addUserCoinsHistory } = require('./coins');
const {redis, deleteKeysByPrefix} = require('./redis');

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const rewards = {
    "first": 3000,
    "second": 2000,
    "thired": 1000
}

const getReferralLeaderboardData = async (start_date, end_date) => {
    const data_query = referralModel.aggregate([ { $match: { $and: [ { timestamp: { $gt: start_date, $lte: end_date } } ] } }, { "$unwind": "$user_id" }, { "$group": { "_id": "$referral_user_id", "count": {"$sum": 1 }}} ])
    return new Promise((async (resolve, reject) => {
        data_query.exec(async function (err, data) {
            if (err) {
                reject(err)
            }
            else {
                data.sort(({ count: a }, { count: b }) => b - a)
                const result = []
                if(data.length === 0){
                    resolve({data: result})
                }
                data.map(async item=>{
                    const user_data = await getUserByUserId(item._id)
                    result.push({
                        user_id: item._id,
                        referral_count: item.count,
                        current_user: false,
                        username: user_data.length>0?user_data[0].username:"",
                        avatar: user_data.length>0?user_data[0].avatar:"https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
                        registered_timestamp: user_data.length>0?user_data[0].timestamp:(+new Date())
                    })
                    if(result.length === data.length){
                        resolve(({data: result.sort((a, b)=> a.registered_timestamp < b.registered_timestamp ? 1 : -1).sort((a, b)=> a.referral_count < b.referral_count ? 1 : -1)}))
                    }
                })
            }
        })
    }))
}

const saveReferralLeaderBoardData = async (referral_leaderboard_id, start_date, ends_on) => {
    const bots = [{"001fb2d6-af85-4f5f-a12a-80db6fc1a0a1": 12}, {"00c70a89-7d16-483f-9ec9-a0067e9608e6": 11}, {"00a1eaf7-c0c6-4279-a664-9a38ffb46424": 9},
                  {"0003bc38-d381-491b-82ce-947add3b31c9": 7}, {"000ea159-d828-43fa-afb5-f15092322490": 1}, {"016d7b47-141e-45ac-b4fd-79aaea3f53b8": 10}, 
                  {"0168b001-e57c-488f-883d-799905904668": 1}, {"01c3e5c7-68fa-410d-8f80-2e8da9f5e605": 11}, {"02c2f35d-b327-4795-8d5d-faf011b2e072": 5},
                  {"03bac2c6-b00c-4f10-9117-1b776e752351": 2}]
    const data = await getReferralLeaderboardData(start_date, ends_on).catch(async error => { console.log(error) })
    if(data.data.length < 10){
        for(let i=0; i<bots.length; i++){
            const user_data = await getUserByUserId(Object.keys(bots[[i]])[0]).catch(async error => { console.log(error) })
            data.data.push({
                user_id: Object.keys(bots[[i]])[0],
                referral_count: Object.values(bots[[i]])[0],
                current_user: false,
                username: user_data.length>0?user_data[0].username:"",
                avatar: user_data.length>0?user_data[0].avatar:"https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
                registered_timestamp: user_data.length>0?user_data[0].timestamp:(+new Date())
            })
            if(data.data.length===10){
                data.data.sort((a, b)=> a.registered_timestamp < b.registered_timestamp ? 1 : -1).sort((a, b)=> a.referral_count < b.referral_count ? 1 : -1)
                const data_query = referralLeaderboardModel.updateOne({referral_leaderboard_id: referral_leaderboard_id}, {$set: {referral_data: data, updated_at: +new Date()}}, {upsert: true})
                data_query.exec(async function (err, data) {
                    if (err) {
                        console.log(err)
                    }
                    else {
                        console.log("Referral Leaderboard Data saved successfully!");
                    }
                })
            }
        }
    }
    else{
        const data_query = referralLeaderboardModel.updateOne({referral_leaderboard_id: referral_leaderboard_id}, {$set: {referral_data: data, updated_at: +new Date()}}, {upsert: true})
        data_query.exec(async function (err, data) {
            if (err) {
                reject(err)
            }
            else {
                console.log("Referral Leaderboard Data saved successfully!");
            }
        })
    }
}

const getReferralLeaderboarAPIdData = async (referral_leaderboard_id) => {
    const data_query = referralLeaderboardModel.findOne({referral_leaderboard_id: referral_leaderboard_id})
    return new Promise((async (resolve, reject) => {
        data_query.exec(async function (err, data) {
            if (err) {
                reject(err)
            }
            else {
                resolve(data);
            }
        })
    }))
}

const referral_leaderboard_result_declare = async (id, event_deatils) => {
    return new Promise((async (resolve, reject) => {
        const data = await getReferralLeaderboarAPIdData(id).catch(async (error)=>{
            console.log(error)
        })
        if(data && !data.result_declare){
            const top_results = data.referral_data.data.slice(0,3);
            top_results.map(async (item, index)=>{
                let reward = rewards["first"]
                if(index === 1){
                    reward = rewards["second"]
                }
                else if(index === 2){
                    reward = rewards["thired"]
                }
                const coinUpdationParams = {
                    TableName: tableUser,
                    Key: { "type": key.userType, "id": item.user_id },
                    UpdateExpression: "set coins = coins + :val",
                    ExpressionAttributeValues: { ":val": parseInt(reward) },
                    ReturnValues: "UPDATED_NEW"
                }
                docClient.update(coinUpdationParams, async function (coinUpdationErr, coinUpdationData) {
                    if (coinUpdationErr) {
                        console.log(coinUpdationErr)
                    } else {
                        const updateUserLeagueData = await updateUserLeague(item.user_id, coinUpdationData.Attributes.coins).catch(async (updateUserLeagueError)=>{
                            console.log(updateUserLeagueError)
                        })
                        if(updateUserLeagueData){
                            const updated = await addUserCoinsHistory({
                                module:"referral_leaderboard",
                                battle_id: event_deatils.id,
                                battle_name: event_deatils.name,
                                battle_image: event_deatils.path,
                                user_id: item.user_id,
                                entry_fee: event_deatils.entryFee,
                                entry_fee_type: event_deatils.entryFeeType,
                                reward_type: event_deatils.rewardType,
                                reward: reward,
                                coins: `+${reward}`,
                                description: `Your rank in referral leaderboard is ${index+1} and earned ${reward} ${event_deatils.rewardType}`,
                                timestamp: +new Date()
                            }).catch(async (err)=>{
                                console.log(err)
                            })
                            if(updated){
                                const data_query = referralLeaderboardModel.updateOne({referral_leaderboard_id: id}, {$set: {result_declare: true}})
                                data_query.exec(async function (err, data) {
                                    if (err) {
                                        reject(err)
                                    }
                                    else {
                                        // Remove chache of coins
                                        await deleteKeysByPrefix('coins_history:')
                                        const cache_data2 = await redis.get(`withdraw:${item.user_id}`);
                                        if(cache_data2) await redis.del(`withdraw:${item.user_id}`)
                                        const cache_data3 = await redis.get(`home_v2:${item.user_id}`)
                                        if(cache_data3) await redis.del(`home_v2:${item.user_id}`)
                                        const cache_data4 = await redis.get(`user_details:${item.user_id}`)
                                        if(cache_data4) await redis.del(`user_details:${item.user_id}`)
                                        console.log(`Result declare of leaderboard id: ${id}`)
                                    }
                                })
                            }
                        }
                    }
                })
            })
        }
    }))
}

module.exports = { getReferralLeaderboardData, saveReferralLeaderBoardData, getReferralLeaderboarAPIdData, referral_leaderboard_result_declare }
