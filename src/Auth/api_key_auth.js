const key = require("../../config/keys")
const { insertActivity } = require("../models/activities")

module.exports = async (req, res, next) => {
    try {
        const headerApiKey = req.headers['x-api-key']
        if (headerApiKey == key.api_key) {
            next()
        }
        else {
            await insertActivity(
                "Unknown",
                "Unknown",
                "battle",
                "User trying to access an api by wrong x-api-key",
                req.url,
                "Wrong x-api-key")
            res.status(401).json({status_code: 401, message: "Authentication Failed"})
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
        res.status(401).json({status_code: 401, message: "Authentication Failed"})
    }
}