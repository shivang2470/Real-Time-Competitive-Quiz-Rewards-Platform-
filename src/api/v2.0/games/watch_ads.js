const express = require('express');
const AWS = require('aws-sdk');
const router = express.Router();
const jwtAuth = require('../../../Auth/game_auth')
const key = require('../../../../config/keys')
const { insertActivity } = require("../../../models/activities")
const { putActivity } = require("../../../Auth/activity_middleware");
const { getBattleFromBattleId, updateUserLeague, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber, updateUserAxPiRomp } = require('../../../models');
const { response, responseError } = require('../../../models/response');
const check_domain_middleware = require('../../../Auth/check_domain_middleware');
const { addGameWatchAddTrackerData, getGameWatchAddTrackerData, updateGameWatchAddTrackerDataTrue } = require('../../../models/tracker');
const { addUserCoinsHistory } = require("../../../models/coins");
const gameWatchAdsModel = require('../../../db/modules/game_watch_ads');
const rateLimit = require("express-rate-limit");

const watch_ad_limit = 1

const ad_limit_min = 60

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 5,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

function subtractMin(numOfMin = ad_limit_min, date = new Date()) {
    date.setMinutes(date.getMinutes() - numOfMin);
    return date;
}

function timeDifference(date1, date2) {
    let difference = date1 - date2;

    let daysDifference = Math.floor(difference / 1000 / 60 / 60 / 24);
    difference -= daysDifference * 1000 * 60 * 60 * 24

    let hoursDifference = Math.floor(difference / 1000 / 60 / 60);
    difference -= hoursDifference * 1000 * 60 * 60

    let minutesDifference = Math.floor(difference / 1000 / 60);
    difference -= minutesDifference * 1000 * 60

    let secondsDifference = Math.floor(difference / 1000);

    return {
        minutesDifference,
        secondsDifference
    }
}

router.get('/', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        let watch_ad_event_id = key.game_watch_ad_event_id
        if (req.query.watch_ad_event_id) {
            watch_ad_event_id = req.query.watch_ad_event_id
        }
        const data = await getBattleFromBattleId(watch_ad_event_id);
        if (data) {
            const result = subtractMin();
            const watch_ad_data = gameWatchAdsModel.find({ user_id: req.userData.user_id, ad_watched: true, timestamp: { $gte: result } })
            watch_ad_data.exec(async function (err, tarcker_data) {
                if (err)
                    throw err;
                else {
                    const watch_ad_count = tarcker_data.length
                    if (watch_ad_count < watch_ad_limit) {
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
                    else {
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
    } catch (e) {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "game watch ad",
            "Error occured in game watch ad route",
            req.url,
            e)
        res.status(500).json(await responseError());
    }
})

router.get('/watch_ad_count', limiter, check_domain_middleware, jwtAuth, putActivity("game watch ads", "Started watching ad of game"), async (req, res) => {
    try{
        const addWatchAdData = await addGameWatchAddTrackerData({
            user_id: req.userData.user_id,
            timestamp: +new Date()
        }).catch(async err => {
            console.log(err)
            res.status(500).json(await responseError());
        })
        if (addWatchAdData) {
            res.status(200).json(await response({ tracker_id: addWatchAdData._id }, 200, `Watch Full video to earn AxPi Romp`))
        }
    } catch(e){
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/watch_ad_count",
            "Error occured in /watch_ad_count route",
            req.url,
            e)
        res.status(500).json(await responseError());
    }
})

router.get('/result', limiter, check_domain_middleware, jwtAuth, putActivity("game watch ads", "Game Ad Watched"), async (req, res) => {
    try{
        if (!req.query.tracker_id) {
            res.status(400).json(await response({}, 405, "Not Allowed"))
        }
        else {
            let watch_ad_event_id = key.game_watch_ad_event_id
            if (req.query.watch_ad_event_id) {
                watch_ad_event_id = req.query.watch_ad_event_id
            }
            const result = subtractMin();
            const watch_ad_data = gameWatchAdsModel.find({ user_id: req.userData.user_id, ad_watched: true, timestamp: { $gte: result } }).count()
            watch_ad_data.exec(async function (err, watch_ad_count) {
                if (err)
                    throw err;
                else {
                    if (watch_ad_count < watch_ad_limit) {
                        const tarcker_data = await getGameWatchAddTrackerData(req.query.tracker_id)
                        if (!tarcker_data['ad_watched']) {
                            await updateGameWatchAddTrackerDataTrue(req.query.tracker_id);
                            const data = await getBattleFromBattleId(watch_ad_event_id);
                            if (data) {
                                let coin_data = {
                                    module: "game_watch_ads",
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
                                const coinUpdationData = await updateUserAxPiRomp(req.userData.user_id, data.data[0].reward);
                                if (coinUpdationData) {
                                    const updated = await addUserCoinsHistory(coin_data);
                                    if (updated) {
                                        await updateUserStatsCount(req.userData.user_id, "game_watch_ad_count")
                                        await updateOverAllCount(`game_watch_ad_count`)
                                        await updateOverAllCount(`game_watch_ads.${new Date().getFullYear()}.count`)
                                        await updateOverAllCount(`game_watch_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                        await updateOverAllCount(`game_watch_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                        await updateOverAllCount(`game_watch_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                        res.status(200).json(await response({}, 200, `Rewarded ${data.data[0].reward} ${data.data[0].rewardType}`))
                                    }
                                }
                            }
                        }
                        else {
                            res.status(400).json(await response({}, 405, "Not Allowed"))
                        }
                    }
                    else {
                        res.status(400).json(await response({}, 400, `Limit of watching ad exceeded`))
                    }
                }
            })
        }
    } catch (e) {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/result",
            "Error occured in /result watch ad route",
            req.url,
            e)
        res.status(500).json(await responseError());
    }
})

module.exports = router;
