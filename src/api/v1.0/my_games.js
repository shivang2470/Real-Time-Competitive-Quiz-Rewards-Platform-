const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const rateLimit = require("express-rate-limit");
const { response, responseError } = require("../../models/response")
const { getUserActiveGames, getUserPreviousGames } = require("../../models/my_games")
const { getAllBattles, getUserByUserId, getSettings } = require("../../models/index")
const { insertActivity } = require("../../models/activities")
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const {redis} = require('../../models/redis');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

// Get all the categories and battles 
router.get('/my_games', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const active_user_id = req.userData.user_id
    if (req.query.page_name === "active") {
        // const activeGames = await getUserActiveGames(
        //     active_user_id,
        //     parseInt(req.query.page),
        //     parseInt(req.query.limit)).catch(async error => {
        //         console.log(error);
        //         await insertActivity(
        //             req.userData.username,
        //             req.userData.user_id,
        //             "my games",
        //             "Error occured in getUserActiveGames function",
        //             req.url,
        //             error)
        //         res.status(500).json(await responseError());
        //     })
        // if(activeGames){
        //     const settings = await getSettings().catch(async error => {
        //         reject(error);
        //     })
        //     res.status(200).json(await response({ active_games: activeGames, battle_message:  settings.battle_share_message.split("(").join(`(www.talentitan.com/battle/`)}, 200, "Data retrieved successfully"))
        // }
        res.status(200).json(await response({ active_games: [], battle_message:  ""}, 200, "Data retrieved successfully"))
    }
    else if (req.query.page_name === "history") {
        const previousGames = await getUserPreviousGames(
            active_user_id,
            parseInt(req.query.page),
            parseInt(req.query.limit)).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "my games",
                    "Error occured in getUserPreviousGames function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
        if(previousGames){
            res.status(200).json(await response({ history: previousGames }, 200, "Data retrieved successfully"))
        }
    }
    else if (req.query.page_name === "recommended") {
        const cache_key = `${req.originalUrl}`
        const cache_data = await redis.get( cache_key );
        if ( cache_data == undefined ){
            const recommendedGames = await getAllBattles().catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "my games",
                    "Error occured in getAllBattles function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(recommendedGames){
                const data_to_send = await response({ recommended_games: recommendedGames.data }, 200, "Data retrieved successfully");
                await redis.set(cache_key, JSON.stringify(data_to_send), {EX: 3600});
                return res.status(200).json(data_to_send);
            }
        }
        else{
            return res.status(200).json(JSON.parse(cache_data))
        }
    }
})

module.exports = router;
