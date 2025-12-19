const express = require("express");
const router = express.Router();
const jwtAuth = require("../../Auth/auth");
const AWS = require("aws-sdk");
const key = require("../../../config/keys");
const voteAuth = require("../../Auth/vote_middleware");
const rateLimit = require("express-rate-limit");
const { insertActivity } = require("../../models/activities");
const { responseError, response } = require("../../models/response");
const { putActivity } = require("../../Auth/activity_middleware");
const {
  incUserVote,
  saveVotedUser,
  canVote,
  isAddCoin,
  updateuserVoteCount,
} = require("../../models/user_vote");
const { userDetail } = require("../../models/user_detail");
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { getBattleFromBattleId, updateUserLeague, updateOverAllCount, getCurrentWeekNumber } = require('../../models');
const { addUserCoinsHistory } = require('../../models/coins');
const { adData } = require("../../models/external_ads");
const {redis, deleteKeysByPrefix} = require("../../models/redis");
const constants = require("../../../config/constants");

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  max: 40,
  message: {
    message: "Too many requests, please try again after sometime",
  },
});

AWS.config.update({
  region: key.region,
  accessKeyId: key.AWS_ACCESS_KEY,
  secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const vote_count = 10;
const vote_event_id = constants.VOTE_EVENT_ID;

const asignCoins = async (data, req, res, coin_data) => {
  const coinUpdationParams = {
    TableName: tableUser,
    Key: { type: key.userType, id: req.userData.user_id },
    UpdateExpression: "set coins = coins + :val",
    ExpressionAttributeValues: { ":val": parseInt(data.data[0].reward) },
    ReturnValues: "UPDATED_NEW",
  };
  docClient.update(
    coinUpdationParams,
    async function (coinUpdationErr, coinUpdationData) {
      if (coinUpdationErr) {
        console.log(coinUpdationErr);
        res.status(500).json(await responseError());
      } else {
        const updateUserLeagueData = await updateUserLeague(
          req.userData.user_id,
          coinUpdationData.Attributes.coins
        ).catch(async (updateUserLeagueError) => {
          res.status(500).json(await responseError());
        });
        if (updateUserLeagueData) {
          const updated = await addUserCoinsHistory(coin_data).catch(
            async (err) => {
              res.status(500).json(await responseError());
            }
          );
          if (updated) {
            // Remove chache of coins
            await deleteKeysByPrefix('coins_history:')
            const cache_data2 = await redis.get(`withdraw:${req.userData.user_id}`);
            if(cache_data2) await redis.del(`withdraw:${req.userData.user_id}`)
            const cache_data3 = await redis.get(`home_v2:${req.userData.user_id}`)
            if(cache_data3) await redis.del(`home_v2:${req.userData.user_id}`)
            const cache_data4 = await redis.get(`user_details:${req.userData.user_id}`)
            if(cache_data4) await redis.del(`user_details:${req.userData.user_id}`)
            const ad_data = await adData(req.userData.user_id, 1)
            res
              .status(200)
              .json(await response({}, 200, "User Voted Successfully", ad_data));
          }
        }
      }
    }
  );
};

// Vote to particular user
router.post('/add_vote', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
  const can_vote = await canVote(req.userData, req.body.vote_data).catch(async error => {
      await insertActivity(
          req.userData.username,
          req.userData.user_id,
          "home",
          "Error occured in canVote function",
          req.url,
          error)
      res.status(500).json(await responseError());
  })
  if (can_vote) {
      let user = await userDetail(req.userData.user_id).catch(async error => {
          await insertActivity(
              req.userData.username,
              req.userData.user_id,
              "battle",
              "Error occured in userDetail function",
              req.url,
              error)
          res.status(500).json(await responseError());
      })
      if(user){
          req.userData.avatar = user.Item.avatar
          req.userData.name = user.Item.name
          const saveVotedUserData = await saveVotedUser(req.userData, req.body.vote_data).catch(async error => {
              // await insertActivity(
              //     req.userData.username,
              //     req.userData.user_id,
              //     "home",
              //     "Error occured in saveVotedUser function",
              //     req.url,
              //     error)
              res.status(500).json(await responseError());
          })
          if(saveVotedUserData){
              const incUserVoteData = await incUserVote(req.body.vote_data).catch(async error => {
                  await insertActivity(
                      req.userData.username,
                      req.userData.user_id,
                      "home",
                      "Error occured in incUserVote function",
                      req.url,
                      error)
                  res.status(500).json(await responseError());
              })
              if(incUserVoteData){
                  const incVoteUserState = await updateuserVoteCount(req.userData.user_id).catch(async error => {
                      await insertActivity(
                          req.userData.username,
                          req.userData.user_id,
                          "home",
                          "Error occured in updateuserVoteCount function",
                          req.url,
                          error)
                      res.status(500).json(await responseError());
                  })
                  if(incVoteUserState){
                      await updateOverAllCount(`vote_count`)
                      await updateOverAllCount(`votes.${new Date().getFullYear()}.count`)
                      await updateOverAllCount(`votes.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                      await updateOverAllCount(`votes.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                      await updateOverAllCount(`votes.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                      const is_reward_coin = await isAddCoin(req.userData.user_id, vote_count);
                      if(is_reward_coin){
                          const data = await getBattleFromBattleId(vote_event_id).catch(async error => {
                              await insertActivity(
                                  req.userData.username,
                                  req.userData.user_id,
                                  "User Vote",
                                  "Error occured in getBattleFromBattleId function",
                                  req.url,
                                  error)
                              res.status(500).json(await responseError());
                              })
                          if(data){
                              let coin_data = {
                                  module:"vote_reward",
                                  battle_id: data.data[0].id,
                                  battle_name: data.data[0].name,
                                  battle_image: data.data[0].path,
                                  user_id: req.userData.user_id,
                                  entry_fee: data.data[0].entryFee,
                                  entry_fee_type: data.data[0].entryFeeType,
                                  reward_type: data.data[0].rewardType,
                                  reward: data.data[0].reward,
                                  coins: `+${data.data[0].reward}`,
                                  description: `You earn ${data.data[0].reward} ${data.data[0].rewardType} for voting ${vote_count} battles`,
                                  timestamp: +new Date()
                              }
                              await updateOverAllCount(`vote_reward_count`)
                              await updateOverAllCount(`vote_rewards.${new Date().getFullYear()}.count`)
                              await updateOverAllCount(`vote_rewards.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                              await updateOverAllCount(`vote_rewards.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                              await updateOverAllCount(`vote_rewards.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                              await asignCoins(data, req, res, coin_data);
                          }
                      }
                      else{
                          const ad_data = await adData(req.userData.user_id, 1)
                          res.status(200).json(await response({}, 200, "User Voted Successfully", ad_data))
                      }
                  }
                  else{
                      const ad_data = await adData(req.userData.user_id, 1)
                      res.status(200).json(await response({}, 200, "User Voted Successfully", ad_data))
                  }
              }
          }
      }
  }
  else {
      res.status(200).json(await response({}, 200, "Time over or user already voted"))
  }
})

module.exports = router;
