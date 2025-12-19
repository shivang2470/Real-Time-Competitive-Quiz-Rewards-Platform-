const AWS = require("aws-sdk");
const key = require("../../config/keys");
const { updateUserLeague } = require("../models");
const { addUserCoinsHistory } = require("../models/coins");
const {redis, deleteKeysByPrefix} = require("./redis");

AWS.config.update({
  region: key.region,
  accessKeyId: key.AWS_ACCESS_KEY,
  secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const consumerAsignCoins = async (data, user_id, coin_data) => {
  const coinUpdationParams = {
    TableName: tableUser,
    Key: { type: key.userType, id: user_id },
    UpdateExpression: "set coins = coins + :val",
    ExpressionAttributeValues: { ":val": parseInt(data.data[0].reward) },
    ReturnValues: "UPDATED_NEW",
  };
  docClient.update(
    coinUpdationParams,
    async function (coinUpdationErr, coinUpdationData) {
      if (coinUpdationErr) {
        console.log(coinUpdationErr);
      } else {
        const updateUserLeagueData = await updateUserLeague(
          user_id,
          coinUpdationData.Attributes.coins
        ).catch(async (updateUserLeagueError) => {
          console.log(updateUserLeagueError);
        });
        if (updateUserLeagueData) {
          const updated = await addUserCoinsHistory(coin_data).catch(
            async (err) => {
              console.log(err);
            }
          );
          if (updated) {
            // Remove chache of coins
            await deleteKeysByPrefix('coins_history:')
            const cache_data2 = await redis.get(`withdraw:${user_id}`);
            if(cache_data2) await redis.del(`withdraw:${user_id}`)
            const cache_data3 = await redis.get(`home_v2:${user_id}`)
            if(cache_data3) await redis.del(`home_v2:${user_id}`)
            const cache_data4 = await redis.get(`user_details:${user_id}`)
            if(cache_data4) await redis.del(`user_details:${user_id}`)
            console.log(`${user_id}: User Voted successfully`);
          }
        }
      }
    }
  );
};

module.exports = { consumerAsignCoins };
