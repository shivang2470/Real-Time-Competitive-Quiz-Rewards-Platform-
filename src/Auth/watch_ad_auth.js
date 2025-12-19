const { insertActivity } = require('../models/activities');
const { response, responseError } = require('../models/response');
const {readWatchAdUserData, deleteWatchAdUserData} = require('./firebase_auth')
const keys = require('../../config/keys')

module.exports = async (req, res, next) => {
    try {
        if(keys.environment === "test"){
            next()
        }
        else{
            const appId = req.headers.app_id
            const unique_token_to_rate_limit = req.userData.user_id
            if(!appId){
                res.status(403).json(await response({}, 403, "No App Id provided"))
            }
            else{
                const data = await readWatchAdUserData(unique_token_to_rate_limit).catch(async err => {
                    console.log(err)
                    await insertActivity(
                        req.userData.user_id,
                        "Unknown",
                        "Auth",
                        "Error in readWatchAdUserData firebase",
                        req.url,
                        err);
                        res.status(500).json(await responseError())
                })
                if(data){
                    await deleteWatchAdUserData(unique_token_to_rate_limit).catch(async err => {
                        console.log(err)
                        await insertActivity(
                            req.userData.user_id,
                            "Unknown",
                            "Auth",
                            "Error in deleteWatchAdUserData firebase",
                            req.url,
                            err);
                        res.status(500).json(await responseError())
                    })
                    next()
                }
                else{
                    await insertActivity(
                        req.userData.user_id,
                        "Unknown",
                        "watch ad auth",
                        "Error while watch ad authentication",
                        req.url,
                        `User tried to access ${req.url} with ${data}`);
                    res.status(400).json(await response({}, 400, "Something bad happened please try again"))
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
            "Error while login/register authentication",
            req.url,
            error);
        res.status(500).json(await responseError())
    }
}
