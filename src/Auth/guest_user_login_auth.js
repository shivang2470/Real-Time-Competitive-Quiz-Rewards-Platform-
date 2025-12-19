const { insertActivity } = require('../models/activities');
const { response, responseError } = require('../models/response');
const keys = require('../../config/keys')

module.exports = async (req, res, next) => {
    try {
        var headerApiKey = req.headers['x-api-key']
        if (headerApiKey == keys.guest_user_login_api_key) {
            next()
        }
        else{
            res.status(401).json(await response({}, 401, "Authentication Failed"))
        }
    }
    catch (error) {
        console.log(error)
        await insertActivity(
            "Unknown",
            "Unknown",
            "Auth",
            "Error while guest user login/register authentication",
            req.url,
            error);
        res.status(500).json(await responseError())
    }
}
