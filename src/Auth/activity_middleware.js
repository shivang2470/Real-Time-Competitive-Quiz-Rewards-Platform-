const { insertActivity } = require("../models/activities")

const putActivity = (page, action_text) => {
    return async function (req, res, next) {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            page,
            action_text,
            req.url).then(async response => {
                next()
            })
            .catch(async error => {
                console.log(error);
            })
    }
}

module.exports = { putActivity }