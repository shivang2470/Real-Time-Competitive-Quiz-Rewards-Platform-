const { response, responseError } = require("../models/response");
const battleModel = require("../db/modules/user_battles");
const votersModel = require("../db/modules/voters");
const userStatsModel = require("../db/modules/user_stats");

const incUserVote = async (vote_data) => {
  let battle_to_update = {};
  let data = battleModel.findOne({
    _id: vote_data.user_battle_id,
  });
  return new Promise(async (resolve, reject) => {
    try {
      data.exec(async function (err, data) {
        if (err) {
          reject(err);
        } else {
          if (data.player1.id === vote_data.voted_user_id) {
            battle_to_update = battleModel.updateOne(
              {
                _id: vote_data.user_battle_id,
                "player1.id": vote_data.voted_user_id,
              },
              { $inc: { "player1.votes": 1 } }
            );
          } else {
            battle_to_update = battleModel.updateOne(
              {
                _id: vote_data.user_battle_id,
                "player2.id": vote_data.voted_user_id,
              },
              { $inc: { "player2.votes": 1 } }
            );
          }
          battle_to_update.exec(async function (err, data) {
            if (err) {
              reject(err);
            } else {
              resolve("updated");
            }
          });
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const saveVotedUser = async (current_user, vote_data) => {
  const new_voter = new votersModel({
    voter_user_id: current_user.user_id,
    voter_username: current_user.username,
    voter_avatar: current_user.avatar,
    voted_player_id: vote_data.voted_user_id,
    user_battle_id: vote_data.user_battle_id,
    timestamp: +new Date(),
  });
  return new Promise((resolve, reject) => {
    try {
      new_voter.save(async function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(await response(result));
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const canVote = async (current_user, vote_data) => {
  let data = votersModel.find({
    user_battle_id: vote_data.user_battle_id,
    voter_user_id: current_user.user_id,
  });
  return new Promise((resolve, reject) => {
    try {
      data.exec(async function (err, data) {
        if (err) {
          reject(err);
        } else {
          if (data.length === 0) {
            let data = battleModel.findOne({
              _id: vote_data.user_battle_id,
            });
            data.exec(async function (err, data) {
              if (err) {
                reject(err);
              } else {
                if (parseInt(data.end_timestamp) >= +new Date()) {
                  resolve(true);
                } else {
                  resolve(false);
                }
              }
            });
          } else {
            resolve(false);
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateuserVoteCount = async (user_id) => {
  const data = userStatsModel.updateOne(
    { user_id: user_id },
    { $set: { updated_timestamp: +new Date() }, $inc: { vote_count: 1 } },
    { upsert: true }
  );
  return new Promise((resolve, reject) => {
    try {
      data.exec(async function (err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const isAddCoin = async (user_id, rewarded_coins) => {
  let data = userStatsModel.findOne({ user_id: user_id });
  return new Promise((resolve, reject) => {
    data.exec(async function (err, data) {
      if (err) {
        reject(err);
      } else {
        if (data.vote_count === 1) {
          resolve(false);
        } else {
          resolve(data.vote_count % rewarded_coins === 0);
        }
      }
    });
  });
};

module.exports = {
  incUserVote,
  saveVotedUser,
  canVote,
  isAddCoin,
  updateuserVoteCount,
};
