const express = require('express');
const router = express.Router();
const auth = require('../../Auth/api_key_auth')
const rateLimit = require("express-rate-limit");
const { responseError, response } = require("../../models/response")
const { other_slack_push_notification } = require("../../models/slack_notifications")
const { insertActivity } = require("../../models/activities")

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 1 minutes
    max: 20, // limit each IP to 10 requests per windowMs
    message:
        "Too many accounts created from this IP, please try again after an hour"
});

// Get all the categories and battles
router.get('/contact', limiter, auth, async (req, res) => {
    const data = await other_slack_push_notification(
        req.query.event,
        req.query.email).catch(async error => {
            await insertActivity(
                "Unknown",
                "Unknown",
                "Contact",
                "Error occured in other_slack_push_notification function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
    if(data){
        return res.status(200).json(await response({}, 200, "Notification Sent"))
    }
})

module.exports = router;
