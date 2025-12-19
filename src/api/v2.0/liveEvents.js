const express = require("express");
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const { response, responseError } = require("../../models/response");
const { getBattlesFromSubCategory } = require("../../models/index");
const constants = require("../../../config/constants");
const {redis} = require("../../models/redis");
const rateLimit = require("express-rate-limit");
const check_domain_middleware = require('../../Auth/check_domain_middleware');

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 20,
  message:{
      message: "Too many requests, please try again after sometime"   
  }
});

router.get("/", limiter, check_domain_middleware, jwtAuth, async (req, res) => {
  try {
    const cache_data = await redis.get(`live_events`)
    if(cache_data) return res.status(200).json(await response(JSON.parse(cache_data)), 200, "Live events Data");
    const data = await getBattlesFromSubCategory(
      "1",
      25,
      constants.LIVE_EVENTS_SUBCATEGORY_ID
    );
    await redis.set(`live_events`, JSON.stringify(data), {EX: 7200});
    return res.status(200).json(await response(data, 200, "Live events Data"));
  } catch (error) {
    throw new Error(error);
  }
});

module.exports = router;
