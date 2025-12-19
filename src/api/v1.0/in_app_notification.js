const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const auth = require('../../Auth/api_key_auth')
const rateLimit = require("express-rate-limit");
const { responseError, response } = require("../../models/response")
const { getHomeData, report_battle, getBattleDetail, getVotersDetail, live_battles_without_bots, old_battles_without_bots_and_results } = require("../../models/home")
const { search_live_battle } = require("../../models/search")
const { insertActivity } = require("../../models/activities")
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { message_acknowledge, message_acknowledge_v2 } = require('../../models/in_app_notifications');
const { adData } = require('../../models/external_ads');
const {redis} = require('../../models/redis');

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 1 minutes
    max: 40, // limit each IP to 10 requests per windowMs
    message:
        "Too many accounts created from this IP, please try again after an hour"
});

router.get('/message', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const data = {
        message_status: false,
        data: {}
    }
    const in_app_notification_data = await message_acknowledge(req.userData.user_id)
    if(in_app_notification_data && Object.keys(in_app_notification_data).length !== 0){
        data["message_status"] = true
        data["data"]["image_url"] = in_app_notification_data.notification_image
        data["data"]["message"] = in_app_notification_data.notification_text
    }
    res.status(200).json(await response(data, 200, "Message retrieved successfully"))
})

router.put('/notification_acknowledge', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    await message_acknowledge_v2(req.userData.user_id)
    const ad_data = await adData(req.userData.user_id, 6);
    const cache_data3 = await redis.get(`home_v2:${req.userData.user_id}`)
    if(cache_data3) await redis.del(`home_v2:${req.userData.user_id}`)
    res.status(200).json(await response({}, 200, "Message Updated Successfully", ad_data));
})

module.exports = router;
