const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { responseError, response } = require("../../models/response")
const { insertActivity } = require("../../models/activities")
const { getUserByUserId } = require('../../models');
const { battlesEnding, createBattlesEndingData } = require('../../models/home');
const {redis} = require('../../models/redis');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 20,
  message:{
      message: "Too many requests, please try again after sometime"   
  }
});

// Get all the battles going to end soon

router.get('/battles_ending', limiter, jwtAuth, check_domain_middleware, async (req, res) => {
  let data = await battlesEnding().catch(async err=>{
    await insertActivity(
        req.userData.username,
        req.userData.user_id,
        "battle",
        "Error occured in battlesEnding function",
        req.url,
        err)
        res.status(500).json(await responseError());
  })
  if(data){
      const data = await createBattlesEndingData(data);
      return res.status(200).json(await response(data, 200, "Data retreived successfully"))
  }
})

router.get('/report_battle_options', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
  const cache_key = `${req.originalUrl}_${req.query.player1_id}_${req.query.player2_id}`
  const cache_data = await redis.get( cache_key );
  if ( cache_data == undefined ){
    const player1_detail = await getUserByUserId(req.query.player1_id)
    const player2_detail = await getUserByUserId(req.query.player2_id)
    const reports = [
        `${player1_detail[0].username} is fake`,
        `${player2_detail[0].username} is fake`,
        "Battle File is showing adult content",
        `${player1_detail[0].username} getting fake votes`,
        `${player2_detail[0].username} getting fake votes`,
        `${player1_detail[0].username} image is not related to this Battle`,
        `${player2_detail[0].username} image is not related to this Battle`,
        `${player1_detail[0].username} uploaded someone else picture`,
        `${player2_detail[0].username} uploaded someone else picture`,
        "Battle information is not right",
        "Other"
    ]
    const data_to_send = await response(reports, 200, "Report data retrieved successfully");
    await redis.set( cache_key, JSON.stringify(data_to_send), {EX: 10800} );
    return res.status(200).json(data_to_send);
  }
  else{
    return res.status(200).json(JSON.parse(cache_data))
  }
})

module.exports = router;
