const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const key = require('../../../config/keys');
const rateLimit = require("express-rate-limit");
const { responseError, response } = require("../../models/response")
const apiKeyAuth = require('../api_key_auth');
const verify_user = require('../../models/user_verify');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 5, // limit each IP to 10 requests per windowMs
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.post('/user_verify', limiter, apiKeyAuth, async (req, res) => {
    await verify_user(req.body.phone_number, req.body.password).catch(async err => {
        return res.status(500).json(await responseError())
    }).then(async data => {
        return res.status(data.code).json(await response({}, data.code, data.message))
    })
})

module.exports = router