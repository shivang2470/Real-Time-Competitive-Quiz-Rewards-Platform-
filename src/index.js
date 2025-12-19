const express = require('express');
const router = express.Router();
// const jwt = require('jsonwebtoken');
const jwtAuth = require('./Auth/auth')
// const key = require("../config/keys")
const { response } = require("./models/response")
const rateLimit = require("express-rate-limit");
const { putActivity } = require("./Auth/activity_middleware")

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 1 minutes
  max: 100, // limit each IP to 10 requests per windowMs
  message:
    "Too many accounts created from this IP, please try again after an hour"
});

// Testing

router.get('/', jwtAuth, async function (req, res, next) {
  return res.status(200).json({ data: "TalenTitan API working" })
});

router.get('/health', async function (req, res, next) {
  return res.status(200).json({ data: "TalenTitan API working" })
});

module.exports = router;
