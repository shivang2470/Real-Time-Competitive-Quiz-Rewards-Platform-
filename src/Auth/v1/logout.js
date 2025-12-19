const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const requestIp = require('request-ip');
const { responseError, response } = require("../../models/response")
const { insertActivity } = require("../../models/activities")
const { getTokenIdByUserAppId, deleteToken } = require('../../models/token');

router.post('/logout', async (req, res) => {
    const headerToken = req.headers.authorization
    const app_id = req.headers.app_id
    let token;
    if(headerToken){
        token = headerToken.toString().split(" ")[1]
    }
    const token_value = jwt.decode(token)
    if(token_value.user_id && token_value.username){
        const token_id =  await getTokenIdByUserAppId(token_value.user_id, app_id).catch(async (tokenError)=>{
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "Logout",
                "Error in getTokenIdByUserAppId function",
                req.url,
                tokenError);
            return res.status(500).json(await responseError());
        })
        if(token_id){
            const deleteTokenData = await deleteToken(token_id.id, requestIp.getClientIp(req)).catch(async (tokenError)=>{
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "Logout",
                    "Error in deleteToken function",
                    req.url,
                    tokenError);
                res.status(500).json(await responseError());
            })
            return res.status(200).json(await response({}, 200, `${token_value.username} logged out Successfully`));
        }
        else{
            return res.status(200).json(await response({}, 200, `${token_value.username} logged out Successfully`));
        }
    }
    else{
        return res.status(200).json(await response({}, 200, `Logged out Successfully`));
    }
})

module.exports = router