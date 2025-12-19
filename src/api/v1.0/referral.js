const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const key = require('../../../config/keys')
const { insertActivity } = require("../../models/activities")
const { putActivity } = require("../../Auth/activity_middleware");
const { getInstructions, getSettings, getBattleFromBattleId } = require('../../models');
const { userDetail } = require("../../models/user_detail");
const { response } = require('../../models/response');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { adData } = require('../../models/external_ads');
const {redis} = require('../../models/redis');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.get('/', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_key = `referral:${req.userData.user_id}`
    const data_to_send_from_cache = await redis.get(cache_key);
    if(data_to_send_from_cache){
        const ad_data = await adData(req.userData.user_id, 12);
        return res.status(200).json(await response(JSON.parse(data_to_send_from_cache), 200, "Referral data retrieved successfully", ad_data)) 
    }
    let referral_event_id = key.referral_event_id
    if(req.query.referral_event_id){
        referral_event_id = req.query.referral_event_id
    }
    const data = await getInstructions(referral_event_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Referral",
            "Error occured in getInstructions function",
            req.url,
            error)
        return res.status(500).json(await responseError());
        })
    if(data){
        const user_detail = await userDetail(req.userData.user_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "Referral",
                "Error occured in getUserByUserId function",
                req.url,
                error)
            return res.status(500).json(await responseError());
            })
        if(user_detail){
            const referral_code = user_detail.Item.referral_code
            let referral_message = await getSettings().catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "Referral",
                    "Error occured in getSettings function",
                    req.url,
                    error)
                return res.status(500).json(await responseError());
                })
            if(referral_message){
                referral_message = referral_message.referral_share_message.split("(").join(`(${referral_code}`)
                const event_data = await getBattleFromBattleId(referral_event_id)
                const ad_data = await adData(req.userData.user_id, 12);
                const data_to_send = {referral_code, instructions: data.data, referral_message, reward: event_data.data[0].reward, reward_type: event_data.data[0].rewardType}
                await redis.set(cache_key, JSON.stringify(data_to_send), {EX: 86400})
                return res.status(200).json(await response(data_to_send), 200, "Referral data retrieved successfully", ad_data);
            }
        }
    }
})

module.exports = router;
