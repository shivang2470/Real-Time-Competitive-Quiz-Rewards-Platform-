const { userDetail } = require("./user_detail");
const { insertActivity } = require("./activities");

const {
  incUserVote,
  saveVotedUser,
  canVote,
  isAddCoin,
  updateuserVoteCount,
} = require("./user_vote");
const { consumerAsignCoins } = require("./consumer_assign_coin");
const { getBattleFromBattleId } = require(".");
const { VOTE_COUNT_REWARD } = require("../../config/constants");
const constants = require("../../config/constants");

const vote_count = VOTE_COUNT_REWARD;
const vote_event_id = constants.VOTE_EVENT_ID;

const voteDataConsumption = async (message) => {
  const messageString = message.value.toString();
  const messageParsed = JSON.parse(messageString);
  const errorMessage = "Some error occured, Please try again";

  let user = await userDetail(messageParsed.user_id).catch(async (error) => {
    await insertActivity(
      "Can't get username, due to no data available in consumer",
      messageParsed.user_id,
      "battle",
      "Error occured in userDetail function",
      "endpoint: /vote",
      error
    );
    console.log(errorMessage);
  });

  if (user) {
    user.Item.user_id = messageParsed.user_id;
    user = user.Item;
    const can_vote = await canVote(user, messageParsed.data).catch(
      async (error) => {
        await insertActivity(
          user.username,
          messageParsed.user_id,
          "home",
          "Error occured in canVote function",
          "endpoint: /vote",
          error
        );
        console.log(errorMessage);
      }
    );
    
    if (can_vote) {
      const saveVotedUserData = await saveVotedUser(
        user,
        messageParsed.data
      ).catch(async (error) => {
        await insertActivity(
          user.username,
          messageParsed.user_id,
          "home",
          "Error occured in saveVotedUser function",
          "endpoint: /vote",
          error
        );
        console.log(errorMessage);
      });
      if (saveVotedUserData) {
        const incUserVoteData = await incUserVote(messageParsed.data).catch(
          async (error) => {
            await insertActivity(
              user.username,
              messageParsed.user_id,
              "home",
              "Error occured in incUserVote function",
              "endpoint: /vote",
              error
            );
            console.log(errorMessage);
          }
        );
        if (incUserVoteData) {
          const incVoteUserState = await updateuserVoteCount(
            messageParsed.user_id
          ).catch(async (error) => {
            await insertActivity(
              user.username,
              messageParsed.user_id,
              "home",
              "Error occured in updateuserVoteCount function",
              "endpoint: /vote",
              error
            );
            console.log(errorMessage);
          });
          if (incVoteUserState) {
            const is_reward_coin = await isAddCoin(
              messageParsed.user_id,
              vote_count
            );
            if (is_reward_coin) {
              const data = await getBattleFromBattleId(vote_event_id).catch(
                async (error) => {
                  await insertActivity(
                    user.username,
                    messageParsed.user_id,
                    "User Vote",
                    "Error occured in getBattleFromBattleId function",
                    "endpoint: /vote",
                    error
                  );
                  console.log(errorMessage);
                }
              );
              if (data) {
                let coin_data = {
                  module: "vote_reward",
                  battle_id: data.data[0].id,
                  battle_name: data.data[0].name,
                  battle_image: data.data[0].path,
                  user_id: messageParsed.user_id,
                  entry_fee: data.data[0].entryFee,
                  entry_fee_type: data.data[0].entryFeeType,
                  reward_type: data.data[0].rewardType,
                  reward: data.data[0].reward,
                  coins: `+${data.data[0].reward}`,
                  description: `You earn ${data.data[0].reward} ${data.data[0].rewardType} for voting ${vote_count} battles`,
                  timestamp: +new Date(),
                };
                await consumerAsignCoins(
                  data,
                  messageParsed.user_id,
                  coin_data
                );
              }
            } else {
              console.log(`${messageParsed.user_id}: User Voted successfully`);
            }
          } else {
            console.log(`${messageParsed.user_id}: User Voted successfully`);
          }
        }
      }
    } else {
        console.log(`Time over or user already voted for user id: ${messageParsed.user_id}`);
    }
  } else {
    console.log(`User Not Found: ${messageParsed.user_id}`);
  }
};

module.exports = { voteDataConsumption };
