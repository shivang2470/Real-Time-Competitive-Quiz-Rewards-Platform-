const AWS = require("aws-sdk");
const key = require("../../config/keys");
const fs = require('fs');
const { response } = require("../models/response");
const battleModel = require("../db/modules/user_battles");
const userCoinsHistoryModel = require("../db/modules/user_coins_history");
const { getLeague } = require("./league");
const loginDevicesModel = require("../db/modules/login_devices");
const userStatsModel = require("../db/modules/user_stats");
const overAllStatsModel = require("../db/modules/overall_stats");
const axios = require("axios");
const { LIVE_EVENTS_SUBCATEGORY_ID } = require("../../config/constants");
const votersModel = require("../db/modules/voters");
const featurePermissionsModel = require("../db/modules/feature_permissions");
const constants = require("../../config/constants");
const externalTransfersModel = require("../db/modules/external_transfers");
const { getTopUpTransactionDetails, getGiftCardTransactionDetails, getReloadlyAccessToken, saveAuthorizationToken } = require("./reloadly");
const dailyActiveUsersModel = require("../db/modules/daily_active_users");
const OTPModel = require("../db/modules/otps");
const ForgetPasswordModel = require("../db/modules/forget_password");
const {redis, deleteKeysByPrefix, fetchKeysWithPrefix} = require("./redis");
const { addUserCoinsHistory } = require("./coins");
const userCheckpointDetailsModel = require("../db/modules/user_checkpoint_details");


AWS.config.update({
  region: key.region,
  accessKeyId: key.AWS_ACCESS_KEY,
  secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
});

const table = key.tableCMS;
const userTable = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const getCategories = async (page, limit) => {
  const params = {
    TableName: table,
    IndexName: "type-index-index",
    KeyConditionExpression: "#type = :hkey",
    ExpressionAttributeNames: {
      "#type": "type",
      "#timestamp": "timestamp",
      "#name": "name",
      "#path": "path",
      "#index": "index",
      "#module": "module",
    },
    ExpressionAttributeValues: { ":hkey": "Category" },
    ProjectionExpression: "id,#name,#path,#timestamp,Category,#index,#module",
    Limit: limit ? limit : 8,
  };

  if (page && page.includes("#")) {
    const pageKey = page.split("#");
    params.ExclusiveStartKey = {
      id: pageKey[0],
      type: "Category",
      index: parseInt(pageKey[1]),
    };
  }

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            if (
              "LastEvaluatedKey" in data &&
              "id" in data.LastEvaluatedKey &&
              "index" in data.LastEvaluatedKey
            ) {
              dataToResolve.nextPage = `${data.LastEvaluatedKey.id}#${data.LastEvaluatedKey.timestamp}`;
            }
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, "No category found"));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getCategoriesDetailsById = async (id) => {
  const params = {
    TableName: table,
    KeyConditionExpression: "#type = :hkey and #id= :hkey2",
    ExpressionAttributeNames: { "#type": "type", "#id": "id" },
    ExpressionAttributeValues: { ":hkey": "Category", ":hkey2": id },
  };

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, `No category found`));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getSubCategoryDetailById = async (id) => {
  const params = {
    TableName: table,
    KeyConditionExpression: "#type = :hkey and #id= :hkey2",
    ExpressionAttributeNames: { "#type": "type", "#id": "id" },
    ExpressionAttributeValues: { ":hkey": "Sub_Category", ":hkey2": id },
  };

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, `No subcategory found`));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getSubCategories = async (page, limit, id, user_id) => {
  const params = {
    TableName: table,
    IndexName: "type-parent_id-index",
    KeyConditionExpression: "#type = :hkey and #parent=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#name": "name",
      "#path": "path",
      "#parent": "parent_id",
      "#id": "id",
      "#reward": "reward"
    },
    ExpressionAttributeValues: { ":hkey": "Sub_Category", ":hkey2": id },
    ProjectionExpression: "#id,#name,#path,Sub_Category,#parent,#reward,rewardType",
    Limit: limit ? limit : 8,
    ScanIndexForward: true,
  };
  if (page && page.includes("#")) {
    const pageKey = page.split("#");
    params.ExclusiveStartKey = {
      id: pageKey[0],
      type: "Sub_Category",
      parent_id: pageKey[1],
    };
  }

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            if (
              "LastEvaluatedKey" in data &&
              "id" in data.LastEvaluatedKey &&
              "parent_id" in data.LastEvaluatedKey
            ) {
              dataToResolve.nextPage = `${data.LastEvaluatedKey.id}#${data.LastEvaluatedKey.parent_id}`;
            }
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, `No subcategory found`));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getAllBattles = async (page, limit) => {
  const params = {
    TableName: table,
    IndexName: "type-index-index",
    KeyConditionExpression: "#type = :hkey",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id",
      "#name": "name",
      "#path": "path",
      "#index": "index",
      "#module": "module",
    },
    ExpressionAttributeValues: { ":hkey": "Battle" },
    ProjectionExpression:
      "entryFee, #name, #module, entryFeeType, #path, battle_date, is_published, earning_limit_per_account, #index, #id, max_player_number, reward, rewardType, endsOn",
    ScanIndexForward: true,
  };

  if (page && page.includes("#")) {
    const pageKey = page.split("#");
    params.ExclusiveStartKey = {
      id: pageKey[0],
      type: "Battle",
      index: parseInt(pageKey[1]),
    };
  }

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            if (
              "LastEvaluatedKey" in data &&
              "id" in data.LastEvaluatedKey &&
              "index" in data.LastEvaluatedKey
            ) {
              dataToResolve.nextPage = `${data.LastEvaluatedKey.id}#${data.LastEvaluatedKey.index}`;
            }
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, "No Battle found"));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getInstructions = async (id) => {
  let params = {
    TableName: table,
    KeyConditionExpression: "#type = :hkey and #id=:hkey2",
    ExpressionAttributeNames: { "#type": "type", "#id": "id" },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": id },
    ProjectionExpression: "instructions",
  };
  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        }
        if (data.Items.length == 0) {
          resolve(await response(data.Items, 404, `No instruction found`));
        } else {
          resolve(
            await response(
              data.Items[0].instructions,
              200,
              "Data retrieved successfully"
            )
          );
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getBattleFromBattleId = async (id) => {
  let params = {
    TableName: table,
    KeyConditionExpression: "#type = :hkey and #id=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id",
      "#path": "path",
      "#name": "name",
      "#levels": "levels",
      "#module": "module"
    },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": id },
    ProjectionExpression:
      "#id, reward, rewardType, entryFee, entryFeeType, #name, #path, category_id, category_name, parent_id, subCategoryName, battleTime, instructions, battle_date, endsOn, earning_limit_per_account, #levels, package_name, quiz_mapping_id, #module, is_published",
  };
  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else if (data.Items.length == 0) {
          resolve(await response(data.Items, 404, `No battle found`));
        } else {
          resolve(
            await response(data.Items, 200, "Data retrieved successfully")
          );
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getBattlesFromSubCategory = async (page, limit, id, user_id) => {
  const params = {
    TableName: table,
    IndexName: "type-parent_id-index",
    KeyConditionExpression: "#type = :hkey and #parent=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id",
      "#parent": "parent_id",
      "#name": "name",
      "#path": "path",
      "#index": "index",
      "#module": "module",
    },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": id },
    Limit: limit ? parseInt(limit) : 25,
    ProjectionExpression:
      "entryFee, #name, #module, entryFeeType, #path, battle_date, is_published, earning_limit_per_account, #index, #id, endsOn, reward, rewardType",
    ScanIndexForward: true,
  };

  if (page && page.includes("#")) {
    const pageKey = page.split("#");
    params.ExclusiveStartKey = {
      id: pageKey[0],
      type: "Battle",
      parent_id: pageKey[1],
    };
  }

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            data.Items = data.Items.sort(function(a,b) {return (a.index > b.index) ? 1 : ((b.index > a.index) ? -1 : 0);} );
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            if (
              "LastEvaluatedKey" in data &&
              "id" in data.LastEvaluatedKey &&
              "parent_id" in data.LastEvaluatedKey
            ) {
              dataToResolve.nextPage = `${data.LastEvaluatedKey.id}#${data.LastEvaluatedKey.parent_id}`;
            }
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, "No battle found"));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getBattlesFromCategory = async (page, limit, id) => {
  const params = {
    TableName: table,
    IndexName: "type-category_id-index",
    KeyConditionExpression: "#type = :hkey and #category=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#category": "category_id",
      "#name": "name",
      "#module": "module",
      "#path": "path",
      "#index": "index",
      "#id": "id",
      "#levels": "levels"
    },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": id },
    Limit: limit ? limit : 8,
    ProjectionExpression:
      "entryFee, #name, #module, entryFeeType, #path, battle_date, is_published, earning_limit_per_account, #index, #id, reward, rewardType, #levels, instructions",
    ScanIndexForward: false,
  };

  if (page && page.includes("#")) {
    const pageKey = page.split("#");
    params.ExclusiveStartKey = {
      id: pageKey[0],
      type: "Battle",
      category_id: pageKey[1],
    };
  }

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          if (data.Items.length > 0) {
            const dataToResolve = await response(
              data.Items,
              200,
              "Data retrieved successfully"
            );
            if (
              "LastEvaluatedKey" in data &&
              "id" in data.LastEvaluatedKey &&
              "category_id" in data.LastEvaluatedKey
            ) {
              dataToResolve.nextPage = `${data.LastEvaluatedKey.id}#${data.LastEvaluatedKey.category_id}`;
            }
            resolve(dataToResolve);
          } else {
            resolve(await response(data.Items, 404, "No battle found"));
          }
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getUserByUserId = async (user_id) => {
  const params = {
    TableName: userTable,
    KeyConditionExpression: "#type = :user and #id = :id",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id",
      "#name": "name",
      "#timestamp": "timestamp",
    },
    ExpressionAttributeValues: { ":user": "user", ":id": user_id },
    ProjectionExpression:
      "avatar,confirmed,#name,total_participation,username,blocked_names_userid, league, coins, referral_code, quiz_participation, referral_count, watch_ad_count, games_count,#timestamp,phone_number,axpi_romp",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getDeletedUserByUserId = async (user_id) => {
  const params = {
    TableName: userTable,
    KeyConditionExpression: "#type = :user and #id = :id",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id",
      "#name": "name",
      "#timestamp": "timestamp",
    },
    ExpressionAttributeValues: { ":user": "deleted_user", ":id": user_id },
    ProjectionExpression:
      "avatar,confirmed,#name,total_participation,username,blocked_names_userid, league, coins, referral_code, quiz_participation, referral_count, watch_ad_count, games_count,#timestamp,phone_number",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const recoverUserDataDeleted = async (user) => {
  const params = {
    TableName: userTable,
    Item: user,
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.put(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const deleteUserByIdAndType = async (type, user_id) => {
  const params = {
    TableName: userTable,
    Key: {
      type: type,
      id: user_id,
    },
  };

  return new Promise((resolve, reject) => {
    docClient.delete(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const copyUserDataDelete = async (user) => {
  const params = {
    TableName: userTable,
    Item: user,
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.put(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getUserBattleByBattleId = async (id) => {
  const battleData = battleModel.find({ _id: id });
  return new Promise(async (resolve, reject) => {
    try {
      battleData.exec(async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateUserBattleByBattleId = async (battle_id, winner, winner_reward) => {
  const battleData = battleModel.updateOne(
    { _id: battle_id },
    { $set: { winner: winner, winner_reward: winner_reward } }
  );
  return new Promise(async (resolve, reject) => {
    try {
      battleData.exec(async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateUserFeeDeducted = async (battle_id) => {
  const battleData = battleModel.updateOne(
    { _id: battle_id },
    { $set: { entry_fee_deducted: true } }
  );
  return new Promise(async (resolve, reject) => {
    try {
      battleData.exec(async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateUserLeague = async (user_id, total_coins) => {
  let new_league = getLeague(total_coins);
  const params = {
    TableName: userTable,
    Key: {
      type: "user",
      id: user_id,
    },
    UpdateExpression: "set league = :league",
    ExpressionAttributeValues: {
      ":league": new_league,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateUserCoins = async (user_id, rewarded_coins) => {
  const params = {
    TableName: userTable,
    Key: {
      type: "user",
      id: user_id,
    },
    UpdateExpression: "set coins = coins + :val",
    ExpressionAttributeValues: {
      ":val": parseInt(rewarded_coins),
    },
    ReturnValues: "UPDATED_NEW",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          // Remove chache of coins
          await deleteKeysByPrefix('coins_history:')
          const cache_data2 = await redis.get(`withdraw:${user_id}`);
          if(cache_data2) await redis.del(`withdraw:${user_id}`)
          const cache_data3 = await redis.get(`home_v2:${user_id}`)
          if(cache_data3) await redis.del(`home_v2:${user_id}`)
          const cache_data4 = await redis.get(`user_details:${user_id}`)
          if(cache_data4) await redis.del(`user_details:${user_id}`)
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateTotalParticipation = async (user_id) => {
  const params = {
    TableName: userTable,
    Key: {
      type: "user",
      id: user_id,
    },
    UpdateExpression: "set total_participation = total_participation + :val",
    ExpressionAttributeValues: {
      ":val": 1,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getUserByPhoneNumber = async (phone_number) => {
  const params = {
    TableName: userTable,
    IndexName: "type-phone_number-index",
    KeyConditionExpression: "#type = :hkey and phone_number=:hkey2",
    ExpressionAttributeNames: { "#type": "type" },
    ExpressionAttributeValues: {
      ":hkey": "user",
      ":hkey2": parseInt(phone_number),
    },
  };
  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        }
        if (data.Items.length == 0) {
          resolve({});
        } else {
          resolve(data.Items[0]);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateUserConfirmed = async (user_id) => {
  const params = {
    TableName: userTable,
    Key: {
      type: "user",
      id: user_id,
    },
    UpdateExpression: "set confirmed = :val",
    ExpressionAttributeValues: {
      ":val": true,
    },
    ReturnValues: "UPDATED_NEW",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getSettings = async () => {
  const params = {
    TableName: table,
    KeyConditionExpression: "#type = :setting",
    ExpressionAttributeNames: {
      "#type": "type",
    },
    ExpressionAttributeValues: {
      ":setting": "setting",
    },
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items[0]);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getUsers = async () => {
  const params = {
    TableName: userTable,
    IndexName: "user_type-timestamp-index",
    KeyConditionExpression: "#user_type = :user_type",
    ExpressionAttributeNames: { "#id": "id", "#user_type": "user_type" },
    ExpressionAttributeValues: { ":user_type": "user" },
    ProjectionExpression: "#id, username, coins",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getUserBalance = async (id) => {
  const total_coins = userCoinsHistoryModel.aggregate([
    {
      $group: {
        _id: null,
        reward: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$user_id", id] },
                  { $ne: ["$reward_type", "Rupees"] },
                ],
              },
              // True
              "$reward",
              // False
              0,
            ],
          },
        },
      },
    },
  ]);

  const total_entry_fee = userCoinsHistoryModel.aggregate([
    {
      $group: {
        _id: null,
        entry_fee: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$user_id", id] },
                  { $ne: ["$entry_fee_type", "Rupees"] },
                ],
              },
              // True
              "$entry_fee",
              // False
              0,
            ],
          },
        },
      },
    },
  ]);

  const total_live_battle_player1_entry_fee = battleModel.aggregate([
    {
      $group: {
        _id: null,
        entry_fee: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$player1.id", id] },
                  { $gte: ["$end_timestamp", new Date().getTime()] },
                ],
              },
              // True
              "$entry_fee",
              // False
              0,
            ],
          },
        },
      },
    },
  ]);

  const total_live_battle_player2_entry_fee = battleModel.aggregate([
    {
      $group: {
        _id: null,
        entry_fee: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$player2.id", id] },
                  { $gte: ["$end_timestamp", new Date().getTime()] },
                ],
              },
              // True
              "$entry_fee",
              // False
              0,
            ],
          },
        },
      },
    },
  ]);

  return new Promise(async (resolve, reject) => {
    try {
      total_coins.exec(async (err, total_rewards) => {
        if (err) {
          reject(err);
        } else {
          total_entry_fee.exec(async (err, total_entry_fee) => {
            if (err) {
              reject(err);
            } else {
              total_live_battle_player1_entry_fee.exec(
                async (err, live_battles_player1_entry_fee) => {
                  if (err) {
                    reject(err);
                  } else {
                    total_live_battle_player2_entry_fee.exec(
                      async (err, live_battles_player2_entry_fee) => {
                        if (err) {
                          reject(err);
                        } else {
                          resolve(
                            total_rewards[0].reward -
                            total_entry_fee[0].entry_fee -
                            (live_battles_player1_entry_fee[0].entry_fee +
                              live_battles_player2_entry_fee[0].entry_fee) +
                            100
                          );
                        }
                      }
                    );
                  }
                }
              );
            }
          });
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const checkBlockedUser = async (phone_number) => {
  const params = {
    TableName: userTable,
    IndexName: "type-phone_number-index",
    KeyConditionExpression: "#type = :hkey and phone_number = :phone_number",
    ExpressionAttributeNames: { "#type": "type" },
    ExpressionAttributeValues: {
      ":hkey": "blocked_user",
      ":phone_number": parseInt(phone_number),
    },
  };
  return new Promise(async (resolve, reject) => {
    docClient.query(params, async function (findingUserErr, userData) {
      if (findingUserErr) {
        reject(findingUserErr);
      } else if (userData == null || userData.Items.length === 0) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

const updateUserCount = async (value, value_to_update) => {
  const params = {
    TableName: table,
    Key: {
      type: "user_stats",
      id: "574f9130-9d1a-44c3-8c17-a1f139c83918",
    },
    UpdateExpression: "set user_count = user_count + :val",
    ExpressionAttributeValues: {
      ":val": parseInt(value),
    },
    ReturnValues: "UPDATED_NEW",
  };
  if (value_to_update) {
    params.UpdateExpression = `set ${value_to_update} = ${value_to_update} + :val`;
  }
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getUserCoinHistoryById = async (id) => {
  const coin_history_data = await userCoinsHistoryModel.findOne({ _id: id }).exec()
  return coin_history_data;
};

const getAllBattlesFromModule = async (module) => {
  const params = {
    TableName: table,
    IndexName: "type-module-index",
    KeyConditionExpression: "#type = :hkey and #module= :hkey2",
    ExpressionAttributeNames: { "#type": "type", "#module": "module" },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": module },
  };
  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getBattleIsPublished = async (battle_id) => {
  const params = {
    TableName: table,
    KeyConditionExpression: "#type = :hkey and #id = :hkey2",
    ExpressionAttributeNames: { "#type": "type", "#id": "id" },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": battle_id },
    ProjectionExpression: "is_published",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items[0]);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateBattleIsPublished = async (battle_id, value) => {
  const params = {
    TableName: table,
    Key: {
      type: "Battle",
      id: battle_id,
    },
    UpdateExpression: "set is_published = :value",
    ExpressionAttributeValues: {
      ":value": value,
    },
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const addLogindevices = async (app_id, user_id) => {
  const query = loginDevicesModel.find({ app_id: app_id });
  return new Promise((resolve, reject) => {
    query.exec(async function (err, data) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        let user_ids_array = [user_id];
        let data_query = {};
        if (data.length === 0) {
          data_query = loginDevicesModel.updateOne(
            { app_id: app_id },
            {
              $set: {
                user_ids: user_ids_array,
                updated_timestamp: +new Date(),
              },
            },
            { upsert: true }
          );
          data_query.exec(async function (err, data) {
            if (err) {
              console.log(err);
              reject(err);
            } else {
              resolve(data);
            }
          });
        } else if (
          data[0].user_ids.length === 1 &&
          !data[0].user_ids.includes(user_id)
        ) {
          data[0].user_ids.push(user_id);
          user_ids_array = data[0].user_ids;
          data_query = loginDevicesModel.updateOne(
            { app_id: app_id },
            {
              $set: {
                user_ids: user_ids_array,
                updated_timestamp: +new Date(),
              },
            },
            { upsert: true }
          );
          data_query.exec(async function (err, data) {
            if (err) {
              console.log(err);
              reject(err);
            } else {
              resolve(data);
            }
          });
        } else {
          resolve([]);
        }
      }
    });
  });
};

const isLoginDevice = async (user_id, app_id) => {
  let query = loginDevicesModel.find({ app_id: app_id });
  return new Promise(async (resolve, reject) => {
    query.exec(async function (err, data) {
      if (err) {
        reject(err);
      } else {
        if (
          data.length === 0 ||
          data[0].user_ids.includes(user_id) ||
          data[0].user_ids.length === 1
        ) {
          resolve({ status: true, data: [] });
        } else {
          resolve({ status: false, data: data[0].user_ids });
        }
      }
    });
  });
};

const updateGoogleSheet = async (
  googleSheets,
  spreadsheetId,
  auth,
  from_account,
  date,
  type_of_debit,
  spend_in,
  quantity,
  bill,
  description,
  invoice
) => {
  return new Promise(async (resolve, reject) => {
    const sheet_entry = await googleSheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: `${new Date().getFullYear()} (Debit)!A:H`,
      valueInputOption: "USER_ENTERED",
      resource: {
        values: [
          [
            from_account,
            date,
            type_of_debit,
            spend_in,
            quantity,
            bill,
            description,
            invoice,
          ],
        ],
      },
    });
    if (sheet_entry) {
      resolve("done");
    }
  });
};

const getEventCount = async (battle_id, user_id) => {
  let countQuery = userCoinsHistoryModel
    .find({ battle_id: battle_id, user_id: user_id })
    .count();
  return new Promise(async (resolve, reject) => {
    countQuery.exec(async function (err, count) {
      if (err) {
        reject(err);
      } else {
        resolve(count);
      }
    });
  });
};

const updateEventCount = async (user_id, rewarded_coins, event_name) => {
  const params = {
    TableName: userTable,
    Key: {
      type: "user",
      id: user_id,
    },
    UpdateExpression: `set ${event_name} = ${event_name} + :val`,
    ExpressionAttributeValues: {
      ":val": parseInt(rewarded_coins),
    },
    ReturnValues: "UPDATED_NEW",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.update(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const updateUserStatsCount = async (user_id, key) => {
  const data = userStatsModel.updateOne(
    { user_id: user_id },
    { $set: { updated_timestamp: +new Date() }, $inc: { [key]: 1 } },
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

const updateOverAllCount = async (key) => {
  const data = overAllStatsModel.updateOne(
    { stats_id: 1 },
    { $set: { updated_timestamp: +new Date() }, $inc: { [key]: 1 } },
    { upsert: true }
  );
  return new Promise((resolve, reject) => {
    try {
      data.exec(async function (err, result) {
        if (err) {
          console.log(err);
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

const getCurrentWeekNumber = () => {
  const adjustedDate = new Date().getDate() + new Date().getDay();
  const prefixes = ["0", "1", "2", "3", "4", "5"];
  return parseInt(prefixes[0 | (adjustedDate / 7)]) + 1;
};

const getBattleUpcoming = async () => {
  const params = {
    TableName: table,
    KeyConditionExpression: "#type = :type",
    FilterExpression: "is_published = :is_published",
    ExpressionAttributeValues: { ":type": "Battle", ":is_published": false },
    ExpressionAttributeNames: {
      "#type": "type",
      "#name": "name",
      "#path": "path",
    },
    ProjectionExpression: "instructions, #path, #name",
  };
  return new Promise(async (resolve, reject) => {
    docClient.query(params, async function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.Items);
      }
    });
  });
};

const getUserStatsCount = async (user_id) => {
  const userStatsData = userStatsModel.findOne({ user_id: user_id });
  return new Promise((resolve, reject) => {
    try {
      userStatsData.exec(async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getOverAllStatsCount = async () => {
  const statsData = overAllStatsModel.findOne({ stats_id: 1 });
  return new Promise(async (resolve, reject) => {
    try {
      statsData.exec(async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const get_math_fact = async () => {
  const max = 1000;
  const min = 1;
  const number = Math.floor(Math.random() * (max - min + 1) + min);
  return new Promise((resolve, reject) => {
    const options = {
      method: "GET",
      url: key.search_battle_facts_url + number + "/math",
      params: { json: "true" },
      headers: {
        "X-RapidAPI-Host": key.search_battle_facts_host,
        "X-RapidAPI-Key": key.rapid_api_key,
      },
    };
    axios
      .request(options)
      .then(function (response) {
        if (response.data.found) {
          resolve(response.data.text);
        } else {
          resolve(false);
        }
      })
      .catch(function (error) {
        console.log(error);
        reject(error);
      });
  });
};

const search_battle_facts = async () => {
  const facts = [];
  while (1) {
    const fact = await get_math_fact();
    if (fact) {
      facts.push(fact);
    }
    if (facts.length == constants.TOTAL_FACTS_IN_SEARCH_BATTLE) {
      return facts;
    }
  }
};

const updateUserAxPiRomp = async (user_id, rewarded_axpi_romp) => {
  const user_details = await getUserByUserId(user_id)
  if (user_details[0].axpi_romp) {
    const params = {
      TableName: userTable,
      Key: {
        type: "user",
        id: user_id,
      },
      UpdateExpression: "set axpi_romp = axpi_romp + :val",
      ExpressionAttributeValues: {
        ":val": parseInt(rewarded_axpi_romp),
      },
      ReturnValues: "UPDATED_NEW",
    };
    return new Promise(async (resolve, reject) => {
      try {
        docClient.update(params, async (err, data) => {
          if (err) {
            reject(err);
          } else {
            const cache_data1 = await redis.get(`game_home:${user_id}`)
            if(cache_data1) await redis.del(`game_home:${user_id}`)
            const cache_data2 = await redis.get(`axpi_romp_details:${user_id}`)
            if(cache_data2) await redis.del(`axpi_romp_details:${user_id}`)
            resolve(data);
          }
        });
      } catch (exec) {
        reject(exec);
      }
    });
  } else {
    let value = 1000 + parseInt(rewarded_axpi_romp);
    const params = {
      TableName: userTable,
      Key: {
        type: "user",
        id: user_id,
      },
      UpdateExpression: "set axpi_romp = :val",
      ExpressionAttributeValues: {
        ":val": value,
      },
      ReturnValues: "UPDATED_NEW",
    };
    return new Promise(async (resolve, reject) => {
      try {
        docClient.update(params, async (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      } catch (exec) {
        reject(exec);
      }
    });
  }
};

async function getRandom(arr, n) {
  var result = new Array(n),
      len = arr.length,
      taken = new Array(len);
  if (n > len)
      throw new RangeError("getRandom: more elements taken than available");
  while (n--) {
      var x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
  }
  return result;
}

const getLiveEventsRandomData = async () => {
  const data = await getBattlesFromSubCategory('', 25, LIVE_EVENTS_SUBCATEGORY_ID);
  const items = await getRandom(data.data, 8);
  return items;
}

const usernameNotExists = async (username) => {
  let params = {
      TableName: userTable,
      IndexName: 'type-username-index',
      KeyConditionExpression: '#type = :hkey and username = :username',
      ExpressionAttributeNames: { '#type': 'type' },
      ExpressionAttributeValues: { ':hkey': key.userType, ':username': username },
  };
  return new Promise((async (resolve, reject) => {
      docClient.query(params, async function (err, data) {
          if (err) {
              reject({status_code: 500, message: err})
          }
          else {
              if (data.Items.length != 0) {
                  reject({status_code: 409, message: "Username already exists!"})
              }
              else {
                  resolve(true)
              }
          }
      })
  }))
}

const suggestusername = async (username) => {
  while(1){
    const resulted_usernames = []
    const pos = Math.floor(Math.random() * (username.length + 1));
    const suggested_usernames = [
      `${username}${parseInt(Math.random()*10)}`,
      `${username}${parseInt(Math.random()*100)}`,
      `${username}${parseInt(Math.random()*1000)}`,
      `${username}${parseInt(Math.random()*1000)}`,
      username.substr(0, pos) + "." +username.substr(pos)
    ]
    for(let i = 0; i < suggested_usernames.length; i++){
      if(await usernameNotExists(suggested_usernames[i]).catch(err =>{})){
        if(suggested_usernames[i][0]!=="." && suggested_usernames[i][suggested_usernames[i].length-1]!==".")
          resulted_usernames.push(suggested_usernames[i]);
      }
      if(resulted_usernames.length === 5){
        return resulted_usernames;
      }
    }
  }
}

const getCountOfUserCoinHistoryByModuleFromParticualarDate = async (battle_id, module, date) => {
  const coin_history_data = userCoinsHistoryModel.find({ battle_id: battle_id, module: module, timestamp: { $gte: date } }).count();
  return new Promise(async (resolve, reject) => {
    try {
      coin_history_data.exec(async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

function subtractDays(date, days) {
  date.setDate(date.getDate() - days);
  return date;
}

const deleteVoteOldAllData = async () => {
  const previous_date = subtractDays(new Date(), 5)
  await votersModel.deleteMany({ timestamp: {$lte: +new Date(previous_date)} }).exec();
  return "done";
};

const getBattleStartDateAndEndDateFromBattleId = async (id) => {
  let params = {
    TableName: table,
    KeyConditionExpression: "#type = :hkey and #id=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id"
    },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": id },
    ProjectionExpression:
      "battle_date, endsOn",
  };
  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else{
          resolve(data.Items);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getFeaturePermissions = async (user_id) => {
  let data = await featurePermissionsModel.find({user_id: user_id}, {feature_permission_settings_id: 1}).exec();
  data = data.map(item => item.feature_permission_settings_id);
  return data;
}

const addFeaturePermission = async (item) => {
  const new_data = await new featurePermissionsModel(item).save();
  return new_data;
}

const deleteFromLoginDevice = async (app_id) => {
  await loginDevicesModel.remove({app_id: app_id}).exec();
  return "done"
};

const deleteAirtimeFile = async () => {
  // Read the content of the file
  fs.writeFile("config/airtime_operators.json", "{}", 'utf8', (err) => {
    if (err) {
        console.error("Error writing file:", err);
        return;
    }
    console.log("Content replaced successfully in airtime_operators.json");
  });
};

const insertAirtimeFile = async (country_code) => {
  let token = await getReloadlyAccessToken("airtime");
    let auth = 'Bearer ' + token;
    let options = {
        method: 'GET',
        url: key.reloadly_airtime_base_url+`/operators/countries/${country_code}`,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth.replace("\n","")
        },
    };
    return new Promise(((resolve, reject) => {
        axios.request(options).then(async function (response) {
            fs.writeFileSync('config/airtime_operators.json', JSON.stringify(response.data));
            resolve(response.data)
        }).catch(async function (error_response) {
            if(error_response.response.status === 401){
                const data = await saveAuthorizationToken("airtime")
                if(data){
                    token = await getReloadlyAccessToken("airtime");
                    auth = 'Bearer ' + token;
                    options = {
                        method: 'GET',
                        url: key.reloadly_airtime_base_url+`/operators/countries/${country_code}`,
                        headers: {
                        'content-type': 'application/json',
                        'Authorization': auth.replace("\n","")
                        },
                    };
                    axios.request(options).then(async function (response) {
                        fs.writeFileSync('config/airtime_operators.json', JSON.stringify(response.data));
                        resolve(response.data)
                    })
                }
            } else {
                reject(error_response);
            }
        });
    }))
}

const changeTransactionStatus = async () => {
  let data = await externalTransfersModel.find({$or:[{status: "PENDING"}, {status: "INITIATED"}]}).exec();
  if(data.length === 0) {
    console.log("No Data to requery...")
  }
  for(let i = 0; i < data.length; i++) {
    if(data[i].ref_id){
      let transactionData = await getTopUpTransactionDetails(data[i].ref_id).catch(async err=>{
        console.log(err)
      });
      if(transactionData){
        await externalTransfersModel.updateOne({_id: data[i]._id}, {status: transactionData.status}).exec();
      } else {
        transactionData = await getGiftCardTransactionDetails(data[i].ref_id).catch(async err=>{
          console.log(err)
        });
        if(transactionData){
          await externalTransfersModel.updateOne({_id: data[i]._id}, {status: transactionData.status}).exec();
        } else {
          await externalTransfersModel.updateOne({_id: data[i]._id}, {status: "FAILED"}).exec();
        }
      }
    } else {
      await externalTransfersModel.updateOne({_id: data[i]._id}, {status: "FAILED"}).exec();
    }
  }
};

const insertDailyActiveUsers = async (id, type, module) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0); // Set to the start of today
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999); // Set to the end of today
  const startTimestamp = startOfDay.getTime();
  const endTimestamp = endOfDay.getTime();
  const query = {
    $or: [
        { user_id: id },
        { guest_user_id: id }
    ],
    module: module,
    timestamp: {
        $gte: startTimestamp,
        $lt: endTimestamp
    }
  };
  const result = await dailyActiveUsersModel.exists(query);
  if(!result){
    let item = {}
    if(type == "guest"){
      item = {
        guest_user_id: id,
        module: module,
        timestamp: +new Date()
      }
      await updateOverAllCount(`daily_active_users.guest.${module}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
    } else{
      item = {
        user_id: id,
        module: module,
        timestamp: +new Date()
      }
      await updateOverAllCount(`daily_active_users.user.${module}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
    }
    await new dailyActiveUsersModel(item).save();
  }
}

const getOtpByPhoneNumber = async (phone_number) => {
  const otpData = await OTPModel.findOne({phone_number: phone_number}).exec();
  return otpData;
}

const saveOtp = async (item) => {
  await new OTPModel(item).save();
  return null;
}

const updateBlockedOtpToTrue = async (id) => {
  await OTPModel.updateOne(
    { _id: id },
    { $set: { blocked: true }}).exec();
    return null;
}

const updateBlockedOtpToFalse = async (id) => {
  await OTPModel.updateOne(
    { _id: id },
    { $set: { blocked: false }}).exec();
    return null;
}

const updateOtpCount = async (id) => {
  await OTPModel.updateOne(
    { _id: id },
    { $inc: { count: 1, resend_otp_count: 1 } }
  ).exec();
  return null;
};

const updateOtp = async (id, otp) => {
  await OTPModel.updateOne(
    { _id: id },
    { $set: { otp:  otp} }
  ).exec();
  return null;
};

const updateTtl = async (id, ttl) => {
  await OTPModel.updateOne(
    { _id: id },
    { $set: { ttl:  ttl} }
  ).exec();
  return null;
};

const deleteOtp = async (id) => {
  await OTPModel.deleteOne({ _id: id }).exec();
  return null;
};

const saveForgetPassword = async (item) => {
  await new ForgetPasswordModel(item).save();
  return null;
}

const getForgetPasswordByPhoneNumber = async (phone_number) => {
  const otpData = await ForgetPasswordModel.findOne({phone_number: phone_number}).exec();
  return otpData;
}

const deleteForgetPassword = async (id) => {
  await ForgetPasswordModel.deleteOne({ _id: id }).exec();
  return null;
};

const checkCheckpoint = async (coins) => {
  let completed_checkpoint_id = 1
  if( coins >= 300 && coins < 600){
      completed_checkpoint_id = 2
  } else if (coins >= 600 && coins < 900) {
      completed_checkpoint_id = 3
  } else if (coins >= 900 && coins < 1200) {
      completed_checkpoint_id = 4
  } else if (coins >= 1200 && coins < 1550) {
      completed_checkpoint_id = 5
  } else if (coins >= 1550) {
      completed_checkpoint_id = 6
  }
  return completed_checkpoint_id;
}

const userCheckpoints = async (user_id) => {
  const user_checkpoint_data = await userCheckpointDetailsModel.find({user_id: user_id}, {checkpoint_id:1, is_rewarded: 1}).exec();
  return user_checkpoint_data;
}

const isCheckpointCrossed = async (old_axpi, new_axpi, user_id) => {
  let old_completed_checkpoint_id = await checkCheckpoint(old_axpi)
  let new_completed_checkpoint_id = await checkCheckpoint(new_axpi)
  let checkpoint_crossed = false;
  let new_checkpoint_details = {}
  if(old_completed_checkpoint_id != new_completed_checkpoint_id && new_completed_checkpoint_id > old_completed_checkpoint_id && new_completed_checkpoint_id != 6){
    const user_checkpoint_data = await userCheckpointDetailsModel.findOne({user_id: user_id, checkpoint_id: new_completed_checkpoint_id}).exec();
    if(!user_checkpoint_data){
      checkpoint_crossed = true
      const checkpoints = constants.CHECKPOINTS
      const checkpointDict = checkpoints.reduce((acc, checkpoint) => {
        acc[checkpoint.id] = checkpoint;
        return acc;
      }, {});
      new_checkpoint_details = checkpointDict[new_completed_checkpoint_id];
      const newData = new userCheckpointDetailsModel({
        user_id: user_id,
        checkpoint_id: new_completed_checkpoint_id,
        old_axpi: old_axpi,
        new_axpi: new_axpi,
        timestamp: +new Date()
      });
      await newData.save();
    }
  }
  return {
    checkpoint_crossed,
    new_checkpoint_details,
    old_completed_checkpoint_id,
    new_completed_checkpoint_id: old_completed_checkpoint_id!=new_completed_checkpoint_id?new_completed_checkpoint_id:0
  }
}

const insertRewardedCheckPointData = async (user_id, new_completed_checkpoint_id, old_axpi, new_axpi, is_rewarded) => {
  const user_checkpoint_data = await userCheckpointDetailsModel.findOne({user_id: user_id, checkpoint_id: new_completed_checkpoint_id}).exec();
    if(!user_checkpoint_data){
      const newData = new userCheckpointDetailsModel({
        user_id: user_id,
        checkpoint_id: new_completed_checkpoint_id,
        old_axpi: old_axpi,
        new_axpi: new_axpi,
        is_rewarded: is_rewarded,
        timestamp: +new Date()
      });
      await newData.save();
  }
}

const rewardCheckpointCrossed = async (user_id, new_completed_checkpoint_id, internal=false) => {
  try {
    const user_axpi = await getUserAxPiByUserid(user_id);
    let current_checkpoint_id = await checkCheckpoint(user_axpi);
    if(new_completed_checkpoint_id > current_checkpoint_id && internal == false){
      return {
        data: {},
        error: true,
        message: 'Checkpoint not reached',
        status_code: 403
      }
    }
    const user_checkpoint_data = await userCheckpointDetailsModel.findOne({user_id: user_id, checkpoint_id: new_completed_checkpoint_id}).exec();
    if(!user_checkpoint_data || user_checkpoint_data['is_rewarded']){
      return {
        data: {},
        error: true,
        message: 'Checkpoint not reached or Checkpoint already rewarded',
        status_code: 412
      }
    }
    const checkpoints = constants.CHECKPOINTS
    const checkpointDict = checkpoints.reduce((acc, checkpoint) => {
      acc[checkpoint.id] = checkpoint;
      return acc;
    }, {});
    const checkpoint_data = checkpointDict[new_completed_checkpoint_id];
    const start_axpi = checkpoint_data['reward_start']
    const end_axpi = checkpoint_data['reward_end']
    const reward = Math.floor(Math.random() * (end_axpi - start_axpi + 1)) + start_axpi;
    let coin_data = {
      module:"checkpoint_crossed",
      battle_id: new_completed_checkpoint_id,
      battle_name: checkpoint_data['checkpoint'],
      battle_image: checkpoint_data['image'],
      user_id: user_id,
      entry_fee: 0,
      entry_fee_type: "AxPi",
      reward_type: "AxPi",
      reward: reward,
      coins: `+${reward}`,
      description: `You earn ${reward} AxPi for crossing a checkpoint`,
      timestamp: +new Date()
  }
  const coinUpdationParams = {
      TableName: userTable,
      Key: { "type": key.userType, "id": user_id },
      UpdateExpression: "set coins = coins + :val",
      ExpressionAttributeValues: { ":val": parseInt(reward) },
      ReturnValues: "UPDATED_NEW"
    }
    return new Promise(((resolve, reject) => {
      docClient.update(coinUpdationParams, async function (coinUpdationErr, coinUpdationData) {
        if (coinUpdationErr) throw new Error(coinUpdationErr);
        await updateUserLeague(user_id, coinUpdationData.Attributes.coins)
        await addUserCoinsHistory(coin_data).catch(async (err)=>{ throw new Error(err) })
        await deleteKeysByPrefix('coins_history:')
        if(await redis.get(`withdraw:${user_id}`)) await redis.del(`withdraw:${user_id}`)
        if(await redis.get(`home_v2:${user_id}`)) await redis.del(`home_v2:${user_id}`)
        if(await redis.get(`user_details:${user_id}`)) await redis.del(`user_details:${user_id}`)
        await userCheckpointDetailsModel.updateOne({user_id: user_id, checkpoint_id: new_completed_checkpoint_id}, {is_rewarded: true})
        resolve({
          data: {
            reward,
            new_completed_checkpoint_id: new_completed_checkpoint_id
          },
          error: false,
          message: 'Claim Rewarded successfully!',
          status_code: 200
        });
      })
    }));
  } catch(err) {
    throw new Error(err);
  }
}

const getUserAxPiByUserid = async (user_id) => {
  const params = {
    TableName: userTable,
    KeyConditionExpression: "#type = :user and #id = :id",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id"
    },
    ExpressionAttributeValues: { ":user": "user", ":id": user_id },
    ProjectionExpression: "coins",
  };
  return new Promise(async (resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items[0].coins);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

const getSubCategoriesByCategoryId = async (catergory_id) => {
  const params = {
    TableName: table,
    IndexName: "type-parent_id-index",
    KeyConditionExpression: "#type = :hkey and #parent=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#name": "name",
      "#path": "path",
      "#parent": "parent_id",
      "#id": "id",
      "#reward": "reward"
    },
    ExpressionAttributeValues: { ":hkey": "Sub_Category", ":hkey2": catergory_id },
    ProjectionExpression: "#id,#name,#path,Sub_Category,#parent,#reward,rewardType",
  };

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data.Items);
      });
    } catch (exec) {
        reject(exec);
    }
  });
};

const getEventsFromSubCategory = async (event_id) => {
  const params = {
    TableName: table,
    IndexName: "type-parent_id-index",
    KeyConditionExpression: "#type = :hkey and #parent=:hkey2",
    ExpressionAttributeNames: {
      "#type": "type",
      "#id": "id",
      "#parent": "parent_id",
      "#name": "name",
      "#path": "path",
      "#index": "index",
      "#module": "module",
    },
    ExpressionAttributeValues: { ":hkey": "Battle", ":hkey2": event_id },
    ProjectionExpression:
      "entryFee, #name, #module, entryFeeType, #path, battle_date, is_published, earning_limit_per_account, #index, #id, endsOn, reward, rewardType",
  };

  return new Promise((resolve, reject) => {
    try {
      docClient.query(params, async (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data.Items);
        }
      });
    } catch (exec) {
      reject(exec);
    }
  });
};

module.exports = {
  getCategories,
  getSubCategories,
  getAllBattles,
  getInstructions,
  getBattleFromBattleId,
  getBattlesFromSubCategory,
  getBattlesFromCategory,
  getCategoriesDetailsById,
  getUserBattleByBattleId,
  updateUserBattleByBattleId,
  updateUserCoins,
  updateUserLeague,
  getUserByUserId,
  updateUserFeeDeducted,
  updateTotalParticipation,
  getSubCategoryDetailById,
  getUserByPhoneNumber,
  updateUserConfirmed,
  getSettings,
  getUsers,
  getUserBalance,
  checkBlockedUser,
  updateUserCount,
  getUserCoinHistoryById,
  getAllBattlesFromModule,
  getBattleIsPublished,
  updateBattleIsPublished,
  addLogindevices,
  isLoginDevice,
  updateGoogleSheet,
  getEventCount,
  updateEventCount,
  updateUserStatsCount,
  updateOverAllCount,
  getCurrentWeekNumber,
  getBattleUpcoming,
  getUserStatsCount,
  getOverAllStatsCount,
  search_battle_facts,
  copyUserDataDelete,
  deleteUserByIdAndType,
  getDeletedUserByUserId,
  recoverUserDataDeleted,
  updateUserAxPiRomp,
  getLiveEventsRandomData,
  usernameNotExists,
  suggestusername,
  getCountOfUserCoinHistoryByModuleFromParticualarDate,
  deleteVoteOldAllData,
  getBattleStartDateAndEndDateFromBattleId,
  getFeaturePermissions,
  addFeaturePermission,
  deleteFromLoginDevice,
  deleteAirtimeFile,
  changeTransactionStatus,
  insertDailyActiveUsers,
  getOtpByPhoneNumber,
  saveOtp,
  updateBlockedOtpToTrue,
  updateBlockedOtpToFalse,
  updateOtpCount,
  updateOtp,
  updateTtl,
  deleteOtp,
  saveForgetPassword,
  getForgetPasswordByPhoneNumber,
  deleteForgetPassword,
  insertAirtimeFile,
  checkCheckpoint,
  isCheckpointCrossed,
  rewardCheckpointCrossed,
  getUserAxPiByUserid,
  userCheckpoints,
  insertRewardedCheckPointData,
  getSubCategoriesByCategoryId,
  getEventsFromSubCategory
};
