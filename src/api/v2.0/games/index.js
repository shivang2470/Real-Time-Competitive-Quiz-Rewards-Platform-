const express = require("express");
const router = express.Router();
const jwtAuth = require('../../../Auth/game_auth')
const { getBattleFromBattleId, updateUserAxPiRomp, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber, getUserCoinHistoryById } = require("../../../models/index");
const { insertActivity } = require("../../../models/activities");
const { addUserCoinsHistory } = require("../../../models/coins");
const { response, responseError } = require("../../../models/response");
const userCoinsHistoryModel = require("../../../db/modules/user_coins_history");
const { insertGameTracker, getGameTracker } = require("../../../models/games");
const rateLimit = require("express-rate-limit");
const check_domain_middleware = require("../../../Auth/check_domain_middleware");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 20,
  message:{
      message: "Too many requests, please try again after sometime"   
  }
});

router.post("/start_game", limiter, jwtAuth, check_domain_middleware, async (req, res) => {
  try{
    if (req.body.game_id) {
      const game_detail = await getBattleFromBattleId(req.body.game_id);
      if (game_detail) {
        await updateUserAxPiRomp(req.userData.user_id, `-${game_detail.data[0].entryFee}`);
        let coin_data = {
          module: "game",
          battle_id: game_detail.data[0].id,
          battle_name: game_detail.data[0].name,
          battle_image: game_detail.data[0].path,
          user_id: req.userData.user_id,
          entry_fee: game_detail.data[0].entryFee,
          entry_fee_type: game_detail.data[0].entryFeeType,
          reward_type: game_detail.data[0].rewardType,
          reward: 0,
          coins: `+0`,
          description: `You earn 0 AxPi Romp for playing Game`,
          timestamp: +new Date()
        }
        const coin_history_data = await addUserCoinsHistory(coin_data);
        if (coin_history_data) {
          await updateUserStatsCount(req.userData.user_id, "total_game_count")
          await updateUserStatsCount(req.userData.user_id, `game_count.${req.body.game_id}`)
          await updateOverAllCount(`game_count`)
          await updateOverAllCount(`games.${new Date().getFullYear()}.count`)
          await updateOverAllCount(`games.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
          await updateOverAllCount(`games.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
          await updateOverAllCount(`games.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
          await updateOverAllCount(`games.${req.body.game_id}.count`)
          await updateOverAllCount(`games.${req.body.game_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
          await updateOverAllCount(`games.${req.body.game_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
          await updateOverAllCount(`games.${req.body.game_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
          res.status(200).json(await response({ tracker_id: coin_history_data._id }, 200, "Game Started"))
        }
      }
    }
    else {
      return res.status(200).json({ status_code: 401, message: "Game id not provided" });
    }
  } catch (e) {
    await insertActivity(
      req.userData.username,
      req.userData.user_id,
      "/start_game",
      "Error occured in /start_game route",
      req.url,
      e)
  }
})

router.post("/game_level_up", limiter, jwtAuth, check_domain_middleware, async (req, res) => {
  try{
    const user_coin_history_data = await getUserCoinHistoryById(req.body.tracker_id);
    const game_detail = await getBattleFromBattleId(req.body.game_id);
    const game_total_levels = (game_detail.data[0].levels).split(",").length;
    if(req.body.game_id && req.body.tracker_id && req.body.level && parseInt(req.body.level)<=game_total_levels && user_coin_history_data && user_coin_history_data.battle_id === req.body.game_id){
      if (game_detail) {
        let reward = game_detail.data[0].reward;
        if(game_detail.data[0].earning_limit_per_account !== -1){
          reward = (game_detail.data[0].levels).split(",")[parseInt(req.body.level)-1]
        }
        const game_tracker_data = await getGameTracker(req.userData.user_id, req.body.game_id, req.body.level);
        if(game_tracker_data.length >= 2 && game_detail.data[0].earning_limit_per_account !== -1){
          res.status(200).json(await response({reward: 0}, 200, "Level UP but no AxPi Romp given!"))
        }
        else {
          await insertGameTracker(req.userData.user_id, req.body.game_id, req.body.level);
          await updateUserAxPiRomp(req.userData.user_id, `${reward}`);
          const coins_data = await getUserCoinHistoryById(req.body.tracker_id);
          const rewaded_till_now = coins_data['reward'];
          await userCoinsHistoryModel.updateOne({"_id": req.body.tracker_id},{ $set: { "reward": parseInt(rewaded_till_now) + parseInt(reward), "coins": `+${parseInt(rewaded_till_now) + parseInt(reward)}`, "description": `You earn ${parseInt(rewaded_till_now) + parseInt(reward)} ${game_detail.data[0].entryFeeType} for playing this game` } })
          res.status(200).json(await response({reward}, 200, "Level UP!"))
        }
      }
    } else {
      return res.status(405).json({ status_code: 405, message: "Game id or Tracker Id or level not provided" });
    }
  } catch (e) {
    await insertActivity(
      req.userData.username,
      req.userData.user_id,
      "/game_level_up",
      "Error occured in /game_level_up function",
      req.url,
      e)
    return res.status(500).json(await responseError());
  }
})

module.exports = router;
