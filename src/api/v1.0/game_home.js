const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { response, responseError } = require('../../models/response');
const { insertActivity } = require('../../models/activities');
const { getHomeData, getGuestHomeData } = require('../../models/games');
const guest_user_auth = require('../../Auth/guest_user_auth');
const jwtAuth = require('../../Auth/game_auth')
const { insertDailyActiveUsers } = require('../../models');
const {redis} = require('../../models/redis');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.get('/home', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        await insertDailyActiveUsers(req.userData.user_id, "user", "talentitan_game")
        const cache_data = await redis.get(`game_home:${req.userData.user_id}`)
        if(cache_data)
            return res.status(200).json(await response(JSON.parse(cache_data)), 200, "Games Home Data");
        const data = await getHomeData(req.userData);
        await redis.set(`game_home:${req.userData.user_id}`, JSON.stringify(data), {EX: 3600});
        return res.status(200).json(await response(data, 200, "Games Home Data"));
    } catch (e) {
        console.log(e)
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/home",
            "Error occured in /home route",
            req.url,
            e)
        return res.status(500).json(await responseError("Something went wrong"));
    }
})

router.get('/guest/home', limiter, check_domain_middleware, guest_user_auth, async (req, res) => {
    try{
        await insertDailyActiveUsers(req.guest_id, "guest", "talentitan_game")
        const cache_data = await redis.get(`game_guest_home`)
        if(cache_data)
            return res.status(200).json(await response({games: JSON.parse(cache_data)}, 200, "Games Guest Home Data"));
        const data = await getGuestHomeData();
        await redis.set(`game_guest_home`, JSON.stringify(data['data']), {EX: 3600});
        return res.status(200).json(await response({games: data['data']}, 200, "Games Guest Home Data"));
    } catch (e) {
        console.log(e)
        await insertActivity(
            "",
            req.guest_id,
            "/home",
            "Error occured in /home route",
            req.url,
            e)
        return res.status(500).json(await responseError("Something went wrong"));
    }
})

module.exports = router;
