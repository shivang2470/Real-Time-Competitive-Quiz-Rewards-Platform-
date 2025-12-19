const jwt = require('jsonwebtoken');
const { insertActivity } = require('../models/activities');
const { response } = require('../models/response');
const keys = require('../../config/keys');
const { get_app_id_from_token } = require('../models/guest_user_login');

module.exports = async (req, res, next) => {
    try {
        if(!req.headers.app_version_code){
            res.status(401).json(await response({}, 401, "Update required or Authentication Failed"))
        }
        const appVersionCode = parseInt(req.headers.app_version_code)
        if(keys.environment === "" || 
            req.query.edit_profile == "true" || 
            req.query.edit_profile == true ||
            req.query.forgot_password == "true" ||
            req.query.forgot_password == true ||
            appVersionCode <= 42){
            next()
        }
        else{
            const appId = req.headers.app_id
            let token;
            const headerToken = req.headers.authorization
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
            if(!appId){
                res.status(401).json(await response({}, 401, "Authentication Failed"))
            }
            const token_value = jwt.decode(token);
            jwt.verify(token, keys.guest_user_login_secret_key, async (err, data) => {
                if (err) {
                    res.status(401).json(await response({}, 401, "Authentication Failed"))
                }
                else{
                    const app_id = await get_app_id_from_token(token_value.guest_id, token)
                    if(app_id === appId){
                        req.guest_id = token_value.guest_id
                        req.app_id = appId
                        next()
                    }
                    else{
                        res.status(401).json(await response({}, 401, "Authentication Failed"))
                    }
                }
            })
        }
    }
    catch (error) {
        console.log(error)
        await insertActivity(
            "Unknown",
            "Unknown",
            "Auth",
            "Error while login/register authentication",
            req.url,
            error);
            res.status(401).json(await response({}, 401, "Authentication Failed"))
    }
}
