const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { responseError, response } = require("../../models/response")
const sns = require("../sns");
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const guest_user_login_auth = require('../guest_user_login_auth');
const { check_app_id, add_guest_user_data, update_guest_user_token } = require('../../models/guest_user_login');
const { insertActivity } = require('../../models/activities');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.get('/guest_user_login', limiter, check_domain_middleware, guest_user_login_auth, async (req, res) => {
    const appId = req.headers.app_id
    if(!appId){
        res.status(401).json(await response({}, 403, "Authorization Failed"))
    }
    else{
        const guest_user_data = await check_app_id(appId).catch(async err=>{
            await insertActivity(
                "Unknown",
                "Unknown",
                "battle",
                "Error while check_app_id in guest user login",
                req.url,
                err)
            res.status(500).json(await responseError())
        })
        let token = {}
        if(guest_user_data.length === 0){
            token = await add_guest_user_data(appId).catch(async err=>{
                await insertActivity(
                    "Unknown",
                    "Unknown",
                    "battle",
                    "Error while add_guest_user_data in guest user login",
                    req.url,
                    err)
                res.status(500).json(await responseError())
            })
            res.status(200).json(await response({token}, 200, "Success"))
        }
        else{
            token = await update_guest_user_token(appId, guest_user_data[0].guest_id).catch(async err=>{
                await insertActivity(
                    "Unknown",
                    "Unknown",
                    "battle",
                    "Error while update_guest_user_token in guest user login",
                    req.url,
                    err)
                res.status(500).json(await responseError())
            })
            res.status(200).json(await response({token}, 200, "Success"))
        }
    }
})

module.exports = router