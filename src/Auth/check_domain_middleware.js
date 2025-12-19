const env = require('../../config/keys');
const { insertActivity } = require('../models/activities');
const { response, responseError } = require('../models/response');

module.exports = async (req, res, next) => {
    try {
        const ALLOWED_HOST=['api.talentitan.com', 'api.test.talentitan.com', 'localhost:5000', '43.204.129.158', '43.204.129.158:5000']  
        const host = req.get('host').toString()
        if(ALLOWED_HOST.includes(host)){
            if(env.in_maintenance == "true" || env.in_maintenance == true){
                res.status(503).json(await response({}, 503, `Application is in under maintenance. Please wait for sometime.`))
            }
            else{
                next()
            }
        }
        else{
            res.status(401).json(await response({}, 401, "Authentication Failed"))
        }
    }
    catch (error) {
        console.error(error)
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
