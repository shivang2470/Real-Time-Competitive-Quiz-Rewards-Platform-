const AWS = require('aws-sdk');
const key = require('../../config/keys');
const gameTrackerModel = require('../db/modules/game_tracker');
const { getBattlesFromCategory } = require('.');
const { userDetail } = require('./user_detail');

const insertGameTracker = async (user_id, game_id, level) => {
    const new_data = new gameTrackerModel({
        game_id,
        user_id,
        level,
        timestamp: +new Date()
    })
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

const getGameTracker = async (user_id, game_id, level) => {
    let dataModel = gameTrackerModel.find({
        user_id: user_id,
        game_id: game_id,
        level: level
    })
    return new Promise((async (resolve, reject) => {
        try{
            dataModel.exec(async function (err, data) {
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

const getGuestHomeData = async () => {
    try{
        const games= await getBattlesFromCategory("", 50, "a2e491d9-0d6c-438a-892b-fa76adbcf93e")
        return(games);
    } catch (e) {
        console.log(e)
        throw new Error(e)
    }
}

const getHomeData = async (current_user_data) => {
    try{
        const user_data = await userDetail(current_user_data.user_id);
        const coins = user_data.Item.coins
        const axpi_romp = user_data.Item.axpi_romp?user_data.Item.axpi_romp:1000
        const name = user_data.Item.name
        const username = user_data.Item.username
        const status = user_data.Item.status
        const games= await getBattlesFromCategory("", 50, "a2e491d9-0d6c-438a-892b-fa76adbcf93e")
        return({
            coins,
            axpi_romp,
            name,
            username,
            status,
            games: games['data']
        });
    } catch (e) {
        console.log(e)
        throw new Error(e)
    }
}

module.exports = {insertGameTracker, getGameTracker, getHomeData, getGuestHomeData}