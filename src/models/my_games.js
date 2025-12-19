const { response, responseError } = require("../models/response")
const battleModel = require('../db/modules/user_battles')

const getUserActiveGames = async (active_user_id, page, limit) => {
    let activeBattlesData = battleModel.find({
        $and: [
            {
                $or: [
                    { 'player1.id': active_user_id },
                    { 'player2.id': active_user_id }]
            },
            {
                end_timestamp: {
                    $gte: new Date().getTime()
                }
            }
        ]
    }).limit(limit).skip(((page - 1)
        * limit)).sort({ "start_timestamp": -1 })
    return new Promise((async (resolve, reject) => {
        try{
            activeBattlesData.exec(async function (err, data) {
                if (err) {
                    reject(err);
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

const getUserPreviousGames = async (active_user_id, page, limit) => {
    let previousBattlesData = battleModel.find({
        $and: [
            {
                $or: [
                    { 'player1.id': active_user_id },
                    { 'player2.id': active_user_id }]
            },
            {
                end_timestamp: {
                    $lte: new Date().getTime()
                }
            }
        ]
    }).limit(limit).skip(((page - 1)
        * limit)).sort({ "start_timestamp": -1 })
    return new Promise((async (resolve, reject) => {
        try{
            previousBattlesData.exec(async function (err, data) {
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

module.exports = { getUserActiveGames, getUserPreviousGames }