const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const rateLimit = require("express-rate-limit");
const { insertActivity } = require("../../models/activities")
const { putActivity } = require("../../Auth/activity_middleware")
const getPreSignedURL = require("../../s3/pre_signed_url_generator")
const key = require('../../../config/keys')
const { userDetail, updateUserDetail, check_current_password, change_password } = require("../../models/user_detail");
const { response, responseError } = require('../../models/response');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { insertDailyActiveUsers } = require('../../models');
const {redis} = require('../../models/redis');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.get('/user_details', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_data = await redis.get(`user_details:${req.userData.user_id}`)
    if(cache_data) return res.status(200).json(await response(JSON.parse(cache_data)), 200, "User data retrieved successfully");
    const user = await userDetail(req.userData.user_id).catch(async error => {
        await insertDailyActiveUsers(req.userData.user_id, "user", "talentitan")
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "battle",
            "Error occured in userDetail function",
            req.url,
            error)
        return res.status(500).json(await responseError());
    })
    if(user){
        await redis.set(`user_details:${req.userData.user_id}`, JSON.stringify(user.Item), {EX: 3600})
        return res.status(200).json(await response(user.Item, 200, "User data retrieved successfully"))
    }
})

router.put('/change_password', limiter, check_domain_middleware, jwtAuth, putActivity("change password", "Change Password"), async (req, res) => {
    const status_code = await check_current_password(req.userData.user_id, req.body.current_password).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "change passoword",
            "Error occured in check_current_password function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(status_code == 200){
        const data = await change_password(req.userData.user_id, req.body.new_password).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "change password",
                "Error occured in change_password function",
                req.url,
                error)
            res.status(500).json(await responseError());
        })
        if(data){
            res.status(200).json(await response({}, 200, "Password Changed"))
        }
    }
    else if(status_code == 403){
        res.status(403).json(await response({}, 403, "Wrong Current Password"))
    }
})

router.put('/update_user_profile', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_data = await redis.get(`user_details:${req.userData.user_id}`)
    if(cache_data) await redis.del(`user_details:${req.userData.user_id}`)
    const data = await updateUserDetail(req.userData.user_id, req.body.update_key, req.body.update_value).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Edit Profile",
            "Error occured in updateUserDetail function",
            req.url,
            error)
        res.status(500).json(await responseError());
        })
    if(data){
        if(data.status_code == 200){
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "Edit Profile",
                `User updated ${req.body.update_key} with ${req.body.update_value}`,
                req.url
            )
            res.status(data.status_code).json(await response(data.data.Attributes, data.status_code, `Updated ${req.body.update_key}`))
        }
        if(data.status_code == 401){
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "Edit Profile",
                `User tried to update ${req.body.update_key} with ${req.body.update_value} (status_code: 401)`,
                req.url
            )
            res.status(data.status_code).json(await response(data.data.Attributes, data.status_code, "Not Authenticated"))
        }
        if(data.status_code == 409){
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "Edit Profile",
                `User tried to update ${req.body.update_key} with ${req.body.update_value} (status_code: 409)`,
                req.url
            )
            res.status(data.status_code).json(await response("", data.status_code, "Phone Number already exists"))
        }
    }
})

router.get('/update_user_avatar', limiter, check_domain_middleware, jwtAuth, putActivity("Edit Profile", "Updating User Avatar"), async (req, res) => {
    const cache_data = await redis.get(`user_details:${req.userData.user_id}`)
    if(cache_data) await redis.del(`user_details:${req.userData.user_id}`)
    const url = await getPreSignedURL(
        key.user_bucket_name,
        `avatar/${req.userData.username}/${req.query.file_name}`
    ).catch(async (error)=>{
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "battle",
            "Error while upload an avatar in edit profile in getPreSignedURL",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(url){
        res.status(200).json(await response(url, 200, "User avatar file url retrieved successfully"))
    }
})

module.exports = router;
