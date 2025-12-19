var key = require("../../config/keys")
const { insertActivity } = require("../models/activities")
const { response } = require("../models/response")

module.exports = async (req, res, next) => {
    try {
        var headerApiKey = req.headers['x-api-key']
        if (headerApiKey == key.start_battle_api_key) {
            next()
        }
        else {
            await insertActivity(
                "Unknown",
                "Unknown",
                "battle",
                "User trying to access create_battle api by wrong x-api-key",
                req.url,
                `Wrong API: ${headerApiKey}`)
            res.status(401).json(await response({}, 401, "Authentication Failed"))
        }
    }
    catch (error) {
        await insertActivity(
            "Unknown",
            "Unknown",
            "battle",
            "Error while authenticating in api_key_auth",
            req.url,
            error)
        res.status(401).json(await response({}, 401, "Authentication Failed"))
    }
}