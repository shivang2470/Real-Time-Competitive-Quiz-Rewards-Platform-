const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const rateLimit = require("express-rate-limit");
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { rewardCheckpointCrossed } = require('../../models');
const { response } = require('../../models/response');
const { adData } = require('../../models/external_ads');
const { putActivity } = require('../../Auth/activity_middleware');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.post('/claim', limiter, check_domain_middleware, jwtAuth, putActivity("Checkpoint Claim", "User is claiming checkpoint"), async (req, res) => {
    const data = await rewardCheckpointCrossed(req.userData.user_id, req.body.checkpoint_id);
    if(data['error']){
        return res.status(data['status_code']).json(await response(data['data'], data['status_code'], data['message']))
    }
    const ad_data = await adData(req.userData.user_id, 21);
    return res.status(data['status_code']).json(await response(data['data'], data['status_code'], data['message'], ad_data))
})

module.exports = router;
