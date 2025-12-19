const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const rateLimit = require("express-rate-limit");
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { getHomeDataV3 } = require('../../models/home');
const { response, responseError } = require('../../models/response');
const { insertActivity } = require('../../models/activities');
const {redis} = require('../../models/redis');
const { isCheckpointCrossed } = require('../../models');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.get('/home', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        const data = await getHomeDataV3(req.userData);
        const checkpoint_data = await isCheckpointCrossed(data['coins'], data['coins'], req.userData.user_id)
        return res.status(200).json(await response(data, 200, "Home Data", null, checkpoint_data));
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

module.exports = router;
