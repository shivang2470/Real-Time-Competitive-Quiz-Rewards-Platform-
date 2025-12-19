const userCoinsHistoryModel = require('../db/modules/user_coins_history')

const addUserCoinsHistory = async (item) => {
    const new_data = new userCoinsHistoryModel(item)
    return new Promise(((resolve, reject) => {
        new_data.save(async function (err, result) {
            if (err) {
                reject(err);
            }
            else {
                try{
                    resolve(result)
                }
                catch(exec){
                    reject(exec)
                }
            }
        })
    }))
}

const getUserCoinsHistory = async (active_user_id, page, limit) => {
    if(!page || !limit){
        page = 1
        limit = 8
    }
    let coinsHistoryData = userCoinsHistoryModel.find({
        user_id: active_user_id
    },
    {"module": 1, "redemption_request_id":1, "user_battle_id": 1, "battle_id": 1, "battle_name": 1, "battle_image": 1, "coins": 1, "entry_fee": 1, "description": 1, "timestamp": 1, "reward": 1, "reward_type": 1, "entry_fee_type": 1}).limit(limit).skip(((page - 1)
        * limit)).sort({ "timestamp": -1 })
    return new Promise((async (resolve, reject) => {
        try{
            coinsHistoryData.exec(async function (err, data) {
                if (err) {
                    reject(err)
                }
                else {
                    if (data.length > 0) {
                        resolve(data)
                    }
                    else {
                        resolve([]);
                    }
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

module.exports = { getUserCoinsHistory, addUserCoinsHistory }