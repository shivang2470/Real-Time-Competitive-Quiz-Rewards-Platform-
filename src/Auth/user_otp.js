const express = require('express');
const router = express.Router();
const request = require("request")
const key = require('../../config/keys');
const auth = require('./api_key_auth');
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip')
const rateLimit = require("express-rate-limit");
const { getUserByPhoneNumber, updateUserConfirmed, updateUserCount, updateOverAllCount, getCurrentWeekNumber, getOtpByPhoneNumber, saveOtp, updateBlockedOtpToTrue, updateOtpCount, updateOtp, updateTtl, deleteOtp, saveForgetPassword, getForgetPasswordByPhoneNumber, deleteForgetPassword } = require('../models');
const { insertActivity } = require("../models/activities");
const { change_password } = require('../models/user_detail');
const { responseError, response } = require("../models/response");
const { addToken } = require('../models/token');
const check_domain_middleware = require('../Auth/check_domain_middleware');
const guest_user_auth = require('./guest_user_auth');
const { getBattleFromBattleId } = require('../models');
const {updateRefreeCoins} = require('../models/referral')
const axios = require('axios');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 5, // limit each IP to 10 requests per windowMs
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

const otps = {}
const forgot_password = []
const otp_limit = 4
const otp_expire_time = 5
const block_time_min = 59
const reset_otp_time_day = 1
const otp_resend_limit = 20

router.post('/send_opt', limiter, check_domain_middleware, auth, guest_user_auth, async (req, res) => {
    const val = Math.floor(1000 + Math.random() * 9000);
    const number = req.body.phone_number 
    const message = val
    let onWhatsApp = 1;
    const config = {
        method: 'get',
        url: 'https://api.p.2chat.io/open/whatsapp/check-number/+916391959762/+91'+number,
        headers: { 
          'X-User-API-Key': process.env.CHAT2_API_KEY
        }
      };
    await axios(config)
      .then(async function (data) {
        if(data.data.on_whatsapp == false) {
            onWhatsApp = 0;
            return res.status(412).json(await response({}, 429, "Please register with your whatsApp Number"));
        }
      })
      .catch(function (error) {
        console.log(error);
      });
    if(onWhatsApp){
        const requestOptions = {
            url: `${key.fast2sms_url}?authorization=${key.fast2sms_api_key}&variables_values=${val}&route=otp&numbers=${number}`,
            method: 'GET'
        };
        if(Object.keys(await getUserByPhoneNumber(number)).length == 0 && req.query.edit_profile == "false" ) {
            return res.status(404).json(await response({}, 404, "Phone Number not Registered with us"))
        } else {
            const otpData = await getOtpByPhoneNumber(number);
            if(otpData && otpData['blocked'])
                return res.status(429).json(await response({}, 429, "Your otp limit has been expired please try again after some time"))
            if (otpData && otpData['resend_otp_count'] > otp_resend_limit)
                return res.status(429).json(await response({}, 429, "Your otp overall count limit has been exceeded. Please contact us at support@talentitan.com"))
            else if(key.send_otp == "true" || key.send_otp == true){
                request(requestOptions, async (err, requestResponse, body) => {
                    if(err){
                        await insertActivity(
                            number,
                            "Unknown",
                            "AxPi",
                            "Error occured whie sending an OTP",
                            req.url,
                            err)
                        res.status(500).json(await response({}, 500, "Error in SMS sending"))
                    } else {
                        const json_body = JSON.parse(body)
                        if(json_body.return){
                            if(otpData){
                                if(otpData['count'] > otp_limit){
                                    await updateBlockedOtpToTrue(otpData['_id'])
                                    return res.status(429).json(await response({}, 429, "Your otp limit has been expired please try again after 1 hour"))
                                } else {
                                    await updateOtpCount(otpData['_id'])
                                    await updateOtp(otpData['_id'], val)
                                    let current_time = new Date()
                                    let exp_time = new Date(current_time)
                                    exp_time.setMinutes(current_time.getMinutes() + otp_expire_time)
                                    exp_time = +new Date(exp_time)
                                    await updateTtl(otpData['_id'], exp_time)
                                }
                            } else {
                                let current_time = new Date()
                                let exp_time = new Date(current_time)
                                exp_time.setMinutes(current_time.getMinutes() + otp_expire_time)
                                exp_time = +new Date(exp_time)
                                await saveOtp({ phone_number: number, otp: val, ttl: exp_time })
                            }
                            return res.status(200).json(await response({}, 200, json_body.message[0]))
                        } else {
                            console.log(json_body)
                            await insertActivity(
                                number,
                                "Unknown",
                                "AxPi",
                                "Error occured whie sending an OTP",
                                req.url,
                                json_body)
                            return res.status(json_body.status_code).json(await response({}, json_body.status_code, json_body.message))
                        }
                    }
                })
            } else {
                return res.status(200).json(await response({}, 200, "SMS sent successfully."))
            }
        }
    }
})

// comes inside when resend otp
// const date = new Date(otps['updated_at']);
// date.setDate(date.getDate() + reset_otp_time_day);
// if((otps[number]['otp']['blocked'] && otps[number]['otp']['block_exp'] <= +new Date()) || date <= +new Date()){
//     let current_time = new Date()
//     let exp_time = new Date(current_time)
//     exp_time.setMinutes(current_time.getMinutes() + otp_expire_time)
//     exp_time = +new Date(exp_time)
//     otps[number] = {
//         otp: {
//             value: val,
//             ttl: exp_time,
//             count: 0,
//             blocked: false,
//             block_exp: '',
//             timestamp: +new Date()
//         }
//     }
// }

router.post('/opt_authenticator', limiter, check_domain_middleware, auth, guest_user_auth, async (req, res) => {
    const otp = req.body.otp;
    const number = req.body.phone_number;
    const app_id = req.headers.app_id
    const otpData = await getOtpByPhoneNumber(number);
    if(!otpData) {
        return res.status(401).json(await response({}, 401, "OTP not sent. Please try again"))
    }
    if(key.send_otp == "true" || key.send_otp == true){
        if(otp == otpData['otp']){
            if(otpData['ttl'] <= +new Date()){
                return res.status(401).json(await response({}, 401, "OTP expired, Please resend otp to get new one"))
            }
            else{
                const user = await getUserByPhoneNumber(number).catch(async err => {
                    await insertActivity(
                        number,
                        "Unknown",
                        "OTP Authenticator",
                        "Error in getUserByPhoneNumber",
                        req.url,
                        err)
                    return res.status(500).json(await responseError())
                })
                if(Object.keys(user).length == 0) {
                    return res.status(404).json(await response({}, 404, "Phone Number not Registered"))
                }
                if(req.query.edit_profile != "true" && req.query.forgot_password != "true"){
                        if(user.confirmed) {
                            await deleteOtp(otpData['_id'])
                            return res.status(403).json(await response({}, 403, "User already confirmed"))
                        }
                        await updateUserConfirmed(user.id).catch(async err => {
                            await insertActivity(
                                number,
                                user.id,
                                "AxPi",
                                "Error in updateUserConfirmed",
                                req.url,
                                err)
                            return res.status(500).json(await responseError())
                        })
                        if(user.refree_code){
                            const event_data = await getBattleFromBattleId(key.referral_event_id).catch(async (err)=>{
                                await insertActivity(
                                    user.username,
                                    "Unknown",
                                    "register",
                                    "Error in getBattleFromBattleId function",
                                    req.url,
                                    err);
                                return res.status(500).json(await responseError())
                            })
                            if(event_data){
                                await updateRefreeCoins(user.refree_code, user.username, user.id, event_data).catch(async update_refree_coins_err =>{
                                    await insertActivity(
                                        user.username,
                                        user.id,
                                        "register",
                                        "Error in updateRefreeAxPi",
                                        req.url,
                                        update_refree_coins_err.message);
                                    return res.status(500).json(await responseError())
                                })
                            }
                        } else {
                            const token_expiration_days = parseInt(key.token_expiration_days)
                            const date = new Date();
                            date.setDate(date.getDate() + token_expiration_days)
                            const expire_timestamp = +new Date(date)
                            jwt.sign({ username: user.username, user_id: user.id }, key.jwtSecret, { expiresIn: `${token_expiration_days}d` }, async function (err, token) {
                                if (err) {
                                    await insertActivity(
                                        user.username,
                                        user.id,
                                        "OTP Authenticator",
                                        "Error in jwt sign",
                                        req.url,
                                        err);
                                    return res.status(500).json(await responseError());
                                } else {
                                    const tokenItems = {
                                        user_id: user.id,
                                        username: user.username,
                                        token,
                                        expire_timestamp,
                                        ip: requestIp.getClientIp(req),
                                        app_id: app_id
                                    }
                                    const addTokenData = await addToken(tokenItems).catch(async (tokenError)=>{
                                        await insertActivity(
                                            user.username,
                                            user.id,
                                            "OTP Authenticator",
                                            "Error in addToken function",
                                            req.url,
                                            tokenError);
                                        return res.status(500).json(await responseError());
                                    })
                                    if(addTokenData){
                                        await deleteOtp(otpData['_id'])
                                        await updateUserCount(1, "user_confirmed_count").catch(async err=>{
                                            await insertActivity(
                                                req.userData.username,
                                                req.userData.user_id,
                                                "battle",
                                                "Error occured in addUserAxPiHistory function",
                                                req.url,
                                                err)
                                            return res.status(500).json(await responseError());
                                        })
                                        await updateOverAllCount(`confirmed_users_count`)
                                        await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.count`)
                                        await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                        await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                        await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                        return res.status(200).json(await response({ token }, 200, "OTP Authenticated"))
                                    }
                                }
                            })
                        }
                } else {
                    if(req.query.forgot_password == "true")
                        await saveForgetPassword({phone_number: number})
                    await deleteOtp(otpData['_id'])
                    return res.status(200).json(await response({}, 200, "OTP Authenticated"))
                }
            }
        } else {
            return res.status(403).json(await response({}, 403, "Wrong OTP"))
        }
    } else {
        if(otp == key.sample_otp){
            const user = await getUserByPhoneNumber(number);
            await updateUserConfirmed(user.id);
            const token_expiration_days = parseInt(key.token_expiration_days)
            const date = new Date();
            date.setDate(date.getDate() + token_expiration_days)
            const expire_timestamp = +new Date(date)
            jwt.sign({ username: user.username, user_id: user.id }, key.jwtSecret, { expiresIn: `${token_expiration_days}d` }, async function (err, token) {
                if (err) {
                    await insertActivity(
                        user.username,
                        user.id,
                        "OTP Authenticator",
                        "Error in jwt sign",
                        req.url,
                        err);
                    return res.status(500).json(await responseError());
                }
                else {
                    const tokenItems = {
                        user_id: user.id,
                        username: user.username,
                        token,
                        expire_timestamp,
                        ip: requestIp.getClientIp(req),
                        app_id: app_id
                    }
                    const addTokenData = await addToken(tokenItems).catch(async (tokenError)=>{
                        await insertActivity(
                            user.username,
                            user.id,
                            "OTP Authenticator",
                            "Error in addToken function",
                            req.url,
                            tokenError);
                        return res.status(500).json(await responseError());
                    })
                    if(addTokenData){
                        await deleteOtp(otpData['_id'])
                        await updateUserCount(1, "user_confirmed_count").catch(async err=>{
                        await insertActivity(
                            req.userData.username,
                            req.userData.user_id,
                            "battle",
                            "Error occured in addUserAxPiHistory function",
                            req.url,
                            err)
                        return res.status(500).json(await responseError());
                    })
                    await updateOverAllCount(`confirmed_users_count`)
                    await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.count`)
                    await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                    await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                    await updateOverAllCount(`confirmed_users.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                    return res.status(200).json(await response({ token }, 200, "OTP Authenticated"))
                    }
                }
            })
        } else {
            return res.status(403).json(await response({}, 403, "Wrong OTP"))
        }
    }
})

router.put('/forgot_password/change_password', limiter, check_domain_middleware, auth, async (req, res) => {
    const number = req.body.change_password
    const password = req.body.password
    if(number && password){
        const forgetPasswordData = await getForgetPasswordByPhoneNumber(number);
        if(forgetPasswordData){
            const user = await getUserByPhoneNumber(number).catch(async err => {
                await insertActivity(
                    number,
                    "Unknown",
                    "OTP Forget Password",
                    "Error in getUserByPhoneNumber",
                    req.url,
                    err)
                return res.status(500).json(await responseError())
            })
            if(Object.keys(user).length == 0){
                await deleteForgetPassword(forgetPasswordData['_id'])
                return res.status(404).json(await response({}, 404, "Phone Number not Registered"))
            } else {
                const data = await change_password(user.id, password).catch(async error => {
                    await insertActivity(
                        "Unknown",
                        user.id,
                        "Forgot Password / Change Password",
                        "Error occured in change_password function",
                        req.url,
                        error)
                    return res.status(500).json(await responseError());
                })
                if(data){
                    await deleteForgetPassword(forgetPasswordData['_id'])
                    return res.status(200).json(await response({}, 200, "Password changed successfully"))
                }
            }
        } else {
            return res.status(401).json(await response({}, 401, "Not authenticated"))
        }
    } else {
        return res.status(400).json(await response({}, 400, "Phone Number and Password both are Required"))
    }
})

module.exports = router;