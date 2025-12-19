const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const requestIp = require('request-ip');
const key = require('../../../config/keys');
const bcrypt = require("bcryptjs");
const jwt = require('jsonwebtoken');
const rateLimit = require("express-rate-limit");
const { responseError, response } = require("../../models/response")
const { loginValidation } = require("../../validations/index")
const { insertActivity } = require("../../models/activities")
const { login_slack_push_notification } = require("../../models/slack_notifications");
const sns = require("../sns");
const { updateToken, getTokenIdByUserAppId, addToken } = require('../../models/token');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const guest_user_auth = require('../../Auth/guest_user_auth');
const { checkBlockedUser, addLogindevices, getUserByUserId } = require('../../models');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20, // limit each IP to 10 requests per windowMs
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

router.post('/login', limiter, check_domain_middleware, guest_user_auth, async (req, res) => {
    const loginValidate = await loginValidation(req.body).catch(async (validationError)=>{
        res.status(400).json(await response({}, 400, validationError));
    })
    if(await checkBlockedUser(req.body.phone_number).catch(async (blockedErr)=>{
        res.status(500).json(await response({}, 500, blockedErr));
    })){
        res.status(502).json(await response({}, 502, "Your account blocked because of suspicious activities."));
    }
    else{
        const app_id = req.headers.app_id
        if (loginValidate && app_id) {
            const phone_number = req.body.phone_number
            const password = req.body.password
            const params = {
                TableName: tableUser,
                IndexName: 'type-phone_number-index',
                KeyConditionExpression: '#type = :hkey and phone_number = :phone_number',
                ExpressionAttributeNames: { '#type': 'type' },
                ExpressionAttributeValues: { ':hkey': key.userType, ':phone_number': parseInt(phone_number) }
            }
            docClient.query(params, async function (findingUserErr, userData) {
                if (findingUserErr) {
                    await insertActivity(
                        phone_number,
                        "Unknown",
                        "login",
                        "Error while Login",
                        req.url,
                        findingUserErr);
                    res.status(500).json(await responseError());
                }
                else if (userData == null || userData.Items.length == 0) {
                    await insertActivity(
                        phone_number,
                        "Unknown",
                        "login",
                        "User Not Exists!",
                        "/login");
                    res.status(404).json(await response({}, 404, "User not exists"));
                }
                else {
                    // const data = await isLoginDevice(userData.Items[0].id, app_id);
                    if(false){
                        const first_account =await getUserByUserId(data.data[0])
                        const second_account =await getUserByUserId(data.data[1])
                        console.info( `Your device can login with only 2 accounts i.e. ${first_account[0].phone_number} and ${second_account[0].phone_number} for app id ${app_id}` );
                        res.status(502).json(await response({}, 502, `Your device can login with only 2 accounts i.e. ${first_account[0].phone_number} and ${second_account[0].phone_number}`));
                    }
                    else{
                        bcrypt.compare(password, userData.Items[0].password).then(async isMatch => {
                        if (isMatch) {
                            if(!userData.Items[0].confirmed){
                                res.status(401).json(await response({}, 401, "User phone number not confirmed"));
                            }
                            else{
                                const token_expiration_days = parseInt(key.token_expiration_days)
                                var date = new Date();
                                date.setDate(date.getDate() + token_expiration_days)
                                const expire_timestamp = +new Date(date)
                                jwt.sign({ username: userData.Items[0].username, user_id: userData.Items[0].id }, key.jwtSecret, { expiresIn: `${token_expiration_days}d` }, async function (err, token) {
                                    if (err) {
                                        await insertActivity(
                                            userData.Items[0].username,
                                            userData.Items[0].id,
                                            "login",
                                            "Error in jwt sign",
                                            req.url,
                                            err);
                                        res.status(500).json(await responseError());
                                    }
                                    else {
                                        const token_id = await getTokenIdByUserAppId(userData.Items[0].id, app_id).catch(async (error)=>{
                                            await insertActivity(
                                                userData.Items[0].username,
                                                userData.Items[0].id,
                                                "Login",
                                                "Error in getTokenIdByUserAppId function",
                                                req.url,
                                                error);
                                            res.status(500).json(await responseError());
                                        })
                                        if(token_id){
                                            const tokenItems = {
                                                id: token_id.id,
                                                user_id: userData.Items[0].id,
                                                username: userData.Items[0].username,
                                                token,
                                                expire_timestamp,
                                                ip: requestIp.getClientIp(req),
                                                app_id: app_id
                                            }
                                            await updateToken(tokenItems).catch(async (tokenError)=>{
                                                await insertActivity(
                                                    userData.Items[0].username,
                                                    userData.Items[0].id,
                                                    "Login",
                                                    "Error in updateToken function",
                                                    req.url,
                                                    tokenError);
                                                res.status(500).json(await responseError());
                                            })
                                        }
                                        else{
                                            const tokenItemsToAdd = {
                                                user_id: userData.Items[0].id,
                                                username: userData.Items[0].usernam,
                                                token,
                                                expire_timestamp,
                                                ip: requestIp.getClientIp(req),
                                                app_id: app_id
                                            }
                                            await addToken(tokenItemsToAdd).catch(async (tokenError)=>{
                                                await insertActivity(
                                                    userData.Items[0].username,
                                                    userData.Items[0].id,
                                                    "Login",
                                                    "Error in addToken function",
                                                    req.url,
                                                    tokenError);
                                                res.status(500).json(await responseError());
                                            })
                                        }
                                        await insertActivity(
                                            userData.Items[0].username,
                                            userData.Items[0].id,
                                            "login",
                                            "User Logged In",
                                            req.url);
                                        await login_slack_push_notification(
                                            phone_number,
                                            userData.Items[0].username,
                                            userData.Items[0].id,
                                            userData.Items[0].coins,
                                            userData.Items[0].league,
                                        )
                                        await addLogindevices(app_id,userData.Items[0].id)
                                        // await add_message({
                                        //     user_id: userData.Items[0].id,
                                        //     notification_text: "Vote 10 battles and get 1 coin for every 10th vote",
                                        //     notification_image: "https://tt-notifications.s3.ap-south-1.amazonaws.com/message_banner.png",
                                        //     timestamp: +new Date()
                                        // })
                                    res.status(200).json(await response({token}, 200, "Login Successful"));
                                    }
                                })
                            }
                        }
                        else {
                            await insertActivity(
                                userData.Items[0].username,
                                userData.Items[0].id,
                                "login",
                                "Password is Wrong!",
                                req.url);
                            res.status(403).json(await response({}, 403, "Password is wrong"));
                            }
                        })
                    }
                }
            })
        }
    }
})

module.exports = router