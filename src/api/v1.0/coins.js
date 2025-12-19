const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const rateLimit = require("express-rate-limit");
const { userDetail } = require("../../models/user_detail")
const { response, responseError } = require('../../models/response');
const { insertActivity } = require("../../models/activities");
const { getUserCoinsHistory } = require('../../models/coins');
const { getSettings } = require('../../models/index');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const {redis} = require('../../models/redis');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

// History
router.get('/coins_history', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_data = await redis.get(`coins_history:${req.query.page}:${req.userData.user_id}`)
    if(cache_data)
        return res.status(200).json(JSON.parse(cache_data), 200, "Data Retrieved Successfully");
    let active_user_id = req.userData.user_id
    const history = await getUserCoinsHistory(
        active_user_id,
        parseInt(req.query.page),
        parseInt(req.query.limit)).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "History",
                "Error occured in getUserAxPisHistory function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
    if(history){
        const user = await userDetail(active_user_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "History",
                "Error occured in userDetail function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
        if(user){
            const settings = await getSettings().catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "History",
                    "Error occured in userDetail function",
                    req.url,
                    error)
                return res.status(500).json(await responseError());
            })
            if(settings){
                const referral_message = settings.referral_share_message.split("(").join(`(${user.Item.referral_code}`)
                const response_data = await response(
                    {
                        "coins": user.Item.coins,
                        "axpi_romp": user.Item.axpi_romp,
                        "referral_code": user.Item.referral_code,
                        "referral_message": referral_message,
                        "history": history
                    })
                await redis.set(`coins_history:${req.query.page}:${req.userData.user_id}`, JSON.stringify(response_data), {EX: 3600});
                return res.status(200).json(response_data, 200, "Data Retrieved Successfully")
            }
        }
    }
})

router.get('/user_coins', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const user = await userDetail(req.userData.user_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Getting AxPi",
            "Error occured in userDetail function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(user){
        res.status(200).json(await response({"coins": user.Item.coins }, 200, "Data Retrieved Successfully"))
    }
})

module.exports = router;
