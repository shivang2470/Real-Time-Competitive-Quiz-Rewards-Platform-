const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const { APP_MIN_VERSION } = require('../../config/constants');
const key = require("../../config/keys");
const { getUserByUserId } = require('../models');
const { insertActivity } = require('../models/activities');
const { response, responseError } = require('../models/response');
const { getTokenIdByUserAppId, updateToken } = require('../models/token');
const { createLog } = require('../models/log_creation');
const path = require('path');

module.exports = async (req, res, next) => {
    try {
        const headerToken = req.headers.authorization
        const appId = req.headers.app_id
        if(!req.headers.app_version_code){
            res.status(401).json(await response({}, 401, "Authentication Failed or Update Required"))
        } else {
            let token;
            const appVersionCode = parseInt(req.headers.app_version_code);
            if(appVersionCode < APP_MIN_VERSION ){
                res.status(426).json(await response({}, 426, "Update Required! Please go to Play Store and update the Application"))
            } else {
                if(headerToken){
                    const splited_token =  headerToken.toString().split(" ")
                    if(splited_token[0] === "Bearer"){
                        splited_token.map(async (inside_token) => {
                            if(inside_token !== "Bearer"){
                                token = inside_token
                            }
                        })
                    }
                    else{
                        res.status(401).json(await response({}, 401, "Authentication Failed"))
                    }
                    if(!token){
                        res.status(401).json(await response({}, 401, "Authentication Failed"))
                    }
                }
                const token_value = jwt.decode(token)
                const sec = key.jwtSecret
                if(!appId){
                    res.status(403).json(await response({}, 403, "No App Id provided"))
                }
                else if(!token){
                    res.status(403).json(await response({}, 403, "No Token provided"))
                }
                // else if((process.env.ENVIRONMENT === "production") && (!appVersionCode || !appVersionName)){
                //     res.status(403).json(await response({}, 403, "Please update an Application from Playstore!"))
                // }
                else{
                    jwt.verify(token, sec, async (err, data) => {
                        if (err) {
                            if(token_value.user_id && token_value.username && token_value.exp){
                                const tokenData = await getTokenIdByUserAppId(token_value.user_id, appId).catch(async (err)=>{
                                    await insertActivity( token_value.username, token_value.user_id, "Auth", "Error occured in getTokenIdByUserAppId while authentication", req.url, err)
                                })
                                if(tokenData && tokenData.token && tokenData.refresh_token){
                                    const expiration_time = tokenData.expire_timestamp
                                    const database_token = tokenData.token
                                    const refresh_token = tokenData.refresh_token
                                    // if(new Date(expiration_time) < new Date() && database_token && refresh_token && database_token === token){
                                    //     Token Expired
                                    //     const token_expiration_days = parseInt(key.token_expiration_days)
                                    //     var date = new Date();
                                    //     date.setDate(date.getDate() + token_expiration_days)
                                    //     const expire_timestamp = +new Date(date)
                                    //     jwt.sign({ username: token_value.username, user_id: token_value.user_id }, key.jwtSecret, { expiresIn: `${token_expiration_days}d` }, async function (err, token) {
                                    //         if (err) {
                                    //             await insertActivity(
                                    //                 token_value.username,
                                    //                 token_value.user_id,
                                    //                 "Auth",
                                    //                 "Error in jwt sign while authentication",
                                    //                 req.url,
                                    //                 err);
                                    //             res.status(200).json(await responseError());
                                    //         }
                                    //         else {
                                    //             const tokenItems = {
                                    //                 id: tokenData.id,
                                    //                 user_id: token_value.user_id,
                                    //                 username: token_value.username,
                                    //                 token,
                                    //                 expire_timestamp,
                                    //                 ip: requestIp.getClientIp(req),
                                    //                 app_id: appId
                                    //             }
                                    //             const update_token = await updateToken(tokenItems).catch(async (tokenError)=>{
                                    //                 await insertActivity(
                                    //                     token_value.username,
                                    //                     token_value.user_id,
                                    //                     "Auth",
                                    //                     "Error in updateToken function while authentication",
                                    //                     req.url,
                                    //                     tokenError);
                                    //                 res.status(200).json(await responseError());
                                    //             })
                                    //             if(update_token){
                                    //                 res.status(200).json(await response({token}, 200, "Updated token"));
                                    //             }
                                    //         }
                                    //     })
                                    // }
                                    // else{
                                        res.status(401).json(await response({}, 401, "Authentication Failed"))
                                    //}
                                }
                                else{
                                    res.status(401).json(await response({}, 401, "Authentication Failed"))
                                }
                            }
                            else{
                                res.status(401).json(await response({}, 401, "Authentication Failed"))
                            }
                        }
                        else {
                            if(token_value.user_id && token_value.username && token_value.exp){
                                const tokenData = await getTokenIdByUserAppId(token_value.user_id, appId).catch(async (err)=>{
                                    await insertActivity( token_value.username, token_value.user_id, "Auth", "Error occured in getTokenIdByUserAppId while authentication", req.url, err)
                                })
                                if(tokenData && tokenData.token && tokenData.refresh_token){
                                    const expiration_time = tokenData.expire_timestamp
                                    const database_token = tokenData.token
                                    const refresh_token = tokenData.refresh_token
                                    const user_data = await getUserByUserId(token_value.user_id).catch(async (err)=>{
                                        await insertActivity( token_value.username, token_value.user_id, "Auth", "Error occured in getUserByUserId while authentication", req.url, err)
                                    })
                                    if(user_data.length!==0 && new Date(expiration_time) >= new Date() && database_token && refresh_token && database_token === token && user_data[0].confirmed){
                                        req.userData = data
                                        req.userData.app_id = appId
                                        next()
                                    }
                                    else{
                                        res.status(401).json(await response({}, 401, "Authentication Failed"))
                                    }
                                }
                                else{
                                    res.status(401).json(await response({}, 401, "Authentication Failed"))
                                }
                            }       
                        }
                    })
                }
            }
        }
    }
    catch (error) {
        console.log(error)
        await insertActivity(
            "Unknown",
            "Unknown",
            "Auth",
            "Error while authentication",
            req.url,
            error);
        res.status(500).json(await responseError())
    }
}
