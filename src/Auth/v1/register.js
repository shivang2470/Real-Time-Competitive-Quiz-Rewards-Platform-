const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const key = require('../../../config/keys');
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require('uuid');
const rateLimit = require("express-rate-limit");
const { registerValidation } = require("../../validations/index")
const { response, responseError } = require("../../models/response")
const { insertActivity } = require("../../models/activities");
const { register_slack_push_notification } = require('../../models/slack_notifications');
const check_domain_middleware = require('../check_domain_middleware');
const guest_user_auth = require('../guest_user_auth');
const { checkBlockedUser, updateUserCount, updateOverAllCount, getCurrentWeekNumber, usernameNotExists, insertRewardedCheckPointData } = require('../../models');
const { add_message } = require('../../models/in_app_notifications');
const walletModel = require('../../db/modules/wallet');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20, // limit each IP to 10 requests per windowMs
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

const phoneNumberExists = async (phone_number) => {
    let params = {
        TableName: tableUser,
        IndexName: 'type-phone_number-index',
        KeyConditionExpression: '#type = :hkey and phone_number = :phone_number',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':hkey': key.userType, ':phone_number': parseInt(phone_number) },
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(params, async function (err, data) {
            if (err) {
                reject({status_code: 500, message: err})
            }
            else {
                if (data.Items.length != 0) {
                    reject({status_code: 406, message: "Phone Number already exists!"});
                }
                else {
                    resolve(true)
                }
            }
        })
    }))
}

const checkReferral = async (refree_code, username, user_id) => {
    const referralCodeCheckingParams = {
        TableName: tableUser,
        IndexName: 'type-referral_code-index',
        KeyConditionExpression: '#type = :hkey and referral_code = :referral_code',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':hkey': key.userType, ':referral_code': refree_code },
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(referralCodeCheckingParams, async function (referralCodeCheckingErr, referralCodeCheckingData) {
            if (referralCodeCheckingErr) {
                reject({status_code: 500, message: referralCodeCheckingErr})
            }
            else {
                if (referralCodeCheckingData.Items.length === 0) {
                    await insertActivity(
                        username,
                        user_id,
                        "register",
                        "Referral code not exists!",
                        "/register");
                    resolve(false)
                }
                else {
                    resolve(true)
                }
            }
        })
    }))
}

router.post('/register', limiter, check_domain_middleware, guest_user_auth, async (req, res) => {
    await register_slack_push_notification(
        "Trying to register",
        req.body.phone_number,
        req.body.username,
        req.body.name
    )
    const validate = await registerValidation(req.body).catch(async (validationError)=>{
        res.status(400).json(await response({}, 400, validationError));
    })
    if(await checkBlockedUser(req.body.phone_number).catch(async (blockedErr)=>{
        res.status(500).json(await response({}, 500, blockedErr));
    })){
        res.status(502).json(await response({}, 502, "Your account blocked because of suspicious activities."));
    }
    else if (validate) {
        const name = req.body.name
        const password = req.body.password;
        const phone_number = req.body.phone_number
        const username = req.body.username
        const refree = req.body.refree_code
        const not_username_exists = await usernameNotExists(username).catch(async (data)=>{
            if(data.status_code === 500){
                await insertActivity(
                    username,
                    "Unknown",
                    "register",
                    "Error in usernameNotExists function",
                    req.url,
                    data.message);
                res.status(500).json(await responseError())
            }
            else if(data.status_code === 409){
                res.status(data.status_code).json(await response({}, data.status_code, data.message))
            }
        })
        if(not_username_exists){
            const not_phone_number_exists = await phoneNumberExists(phone_number).catch(async (data)=>{
                if(data.status_code === 500){
                    await insertActivity(
                        username,
                        "Unknown",
                        "register",
                        "Error in phoneNumberExists function",
                        req.url,
                        data.message);
                    res.status(500).json(await responseError())
                }
                else if(data.status_code === 406){
                    res.status(data.status_code).json(await response({}, data.status_code, data.message))
                }
            })
            if(not_phone_number_exists){
                const d = new Date();
                const date = d.getDate()
                const h = d.getHours()
                const m = d.getMinutes()
                const s = d.getSeconds()
                const smill = d.getMilliseconds()
                const userId = uuidv4()
                const referral_code = m + "" + h + "" + date + "" + s + "" + parseInt(smill)
                const avatar = "https://ui-avatars.com/api/?rounded=true&name=" + name + "&background=random"
                const params = {
                    TableName: tableUser,
                    Item: {
                        "id": userId,
                        "type": key.userType,
                        "name": name,
                        "username": username,
                        "phone_number": parseInt(phone_number),
                        "timestamp": +new Date(),
                        "total_participation": 0,
                        "quiz_participation": 0,
                        "referral_count": 0,
                        "watch_ad_count": 0,
                        "games_count": 0,
                        "referral_code": referral_code,
                        "avatar": avatar,
                        "confirmed": false,
                        "coins": 100,
                        "blocked_names_userid": [],
                        "league": "Bronze I",
                        "clan": "",
                        "clan_id": "",
                        "user_type": key.userType,
                        "status": "Available",
                        "axpi_romp": 1000
                    },
                };
                if (refree) {
                    const is_referral = await checkReferral(refree, username, userId).catch(async check_referral_coins_err =>{
                        await insertActivity(
                            username,
                            userId,
                            "register",
                            "Error in updateRefreeAxPi",
                            req.url,
                            check_referral_coins_err.message);
                        res.status(500).json(await responseError())
                    })
                    if(is_referral){
                        params["Item"]["refree_code"] = refree
                    }
                }
                bcrypt.genSalt(10, async (err, salt) => {
                    bcrypt.hash(password, salt, async (hash_err, password_hash) => {
                        if (hash_err || err) {
                            await insertActivity(
                                username,
                                "Unknown",
                                "register",
                                "Password not hashed",
                                req.url,
                                hash_err);
                            res.status(500).json(await responseError())
                        }
                        else {
                            params.Item.password = password_hash
                            docClient.put(params, async function (insert_error, insert_data) {
                                if (err) {
                                    await insertActivity(
                                        username,
                                        username,
                                        "register",
                                        "Unable to add item",
                                        req.url,
                                        insert_error);
                                    res.status(500).json(await responseError())
                                } 
                                else {
                                    const user_count_updated = await updateUserCount(1).catch(async err=>{
                                        await insertActivity(
                                            username,
                                            userId,
                                            "battle",
                                            "Error occured in addUserAxPiHistory function",
                                            req.url,
                                            err)
                                        res.status(500).json(await responseError());
                                    })
                                    if(user_count_updated){
                                        await add_message({
                                            user_id: userId,
                                            notification_header: "Notification",
                                            notification_text: "Vote 10 live battles and get 1 AxPi for every 10th vote",
                                            timestamp: +new Date()
                                        })
                                        await updateOverAllCount(`users_count`)
                                        await updateOverAllCount(`users.${new Date().getFullYear()}.count`)
                                        await updateOverAllCount(`users.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                        await updateOverAllCount(`users.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                        await updateOverAllCount(`users.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                        await new walletModel({
                                            user_id: userId,
                                            balance: 0.0,
                                            created_at: +new Date(),
                                            updated_at: +new Date()
                                        }).save()
                                        await register_slack_push_notification(
                                            userId,
                                            phone_number,
                                            username,
                                            name
                                        )
                                        await insertRewardedCheckPointData(userId, 1, 0, 100, true);
                                        res.status(200).json(await response({}, 200, `${username} registered successfully`))
                                    }
                                }
                            })
                        }
                    })
                })
            }
        }
    }
})
                    

module.exports = router;