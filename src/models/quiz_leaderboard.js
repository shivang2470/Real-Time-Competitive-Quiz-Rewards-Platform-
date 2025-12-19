const AWS = require("aws-sdk");
const {
  getUserByUserId,
  getBattleFromBattleId,
  updateUserLeague,
  getCountOfUserCoinHistoryByModuleFromParticualarDate,
  getBattleStartDateAndEndDateFromBattleId,
  getUserAxPiByUserid,
  isCheckpointCrossed,
} = require(".");
const key = require("../../config/keys");
const quizModel = require("../db/modules/quizzes");
const quizLeaderboardDetailsModel = require("../db/modules/quiz_leaderboard_details");
const { getQuestionAnswer, getQuizIdByQuestionId } = require("./quiz");
const quizLeaderboardModel = require("../db/modules/quiz_leaderboard");
const { addUserCoinsHistory } = require("./coins");
const { QUIZ_LEADERBOARD_EVENT_COUNT, QUIZ_LEADERBOARD_TOTAL_REWARD_COUNT } = require("../../config/constants");
const quizLeaderboardBotsDailyScoresModel = require("../db/modules/quiz_leaderboard_bots_daily_scores");
const {redis, deleteKeysByPrefix, fetchKeysWithPrefix} = require("./redis");

AWS.config.update({
  region: key.region,
  accessKeyId: key.AWS_ACCESS_KEY,
  secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
});

const table = key.tableCMS;
const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

function getRandom(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const question_time = { less: 20, 15: 30, 40: 50, 70: 80, other: 120 };

const rewards = {
  first: 200,
  second: 100,
  thired: 50,
};

const getEventIdentifier = async (quiz_leaderboard_id) => {
  const data = await getBattleStartDateAndEndDateFromBattleId(quiz_leaderboard_id);
  return(data[0].battle_date+"-"+data[0].endsOn)
};

const insertQuizLeaderboardDetails = async (
  quiz_leaderboard_id,
  user_id,
  user_question_count
) => {
  return new Promise(async (resolve, reject) => {
    new quizLeaderboardDetailsModel({
      event_id: await getEventIdentifier(quiz_leaderboard_id),
      quiz_leaderboard_id: quiz_leaderboard_id,
      user_id: user_id,
      correct_answers_count: 0,
      total_questions_count: user_question_count,
      consider_quiz: true,
      timestamp: +new Date(),
    }).save(async function (err, result) {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

const getQuestionCount = async (id) => {
  const params = {
    TableName: table,
    IndexName: "parent_id-index-index",
    KeyConditionExpression: "#parent_id=:hkey2",
    ExpressionAttributeNames: { "#parent_id": "parent_id" },
    ExpressionAttributeValues: { ":hkey2": id },
    Select: "COUNT",
  };
  return new Promise(async (resolve, reject) => {
    docClient.query(params, async function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const getQuizleaderboardQuestions = async (id, user_question_count) => {
  const question_count = await getQuestionCount(id);
  const indexe_arr = [];
  const questions = [];
  return new Promise(async (resolve, reject) => {
    while (1) {
      const index = getRandom(1, parseInt(question_count.Count));
      if (!indexe_arr.includes(index)) {
        indexe_arr.push(index);
        if (indexe_arr.length >= user_question_count + 1) break;
        const params = {
          TableName: table,
          IndexName: "parent_id-index-index",
          KeyConditionExpression: "#parent_id=:hkey and #index=:hkey2",
          ExpressionAttributeNames: {
            "#parent_id": "parent_id",
            "#index": "index",
            "#path": "path",
            "#description": "description",
          },
          ExpressionAttributeValues: { ":hkey": id, ":hkey2": parseInt(index) },
          ProjectionExpression:
            "id,#parent_id,question,#index,option1,option2,option3,option4,correctans,#path,#description",
        };
        docClient.query(params, async function (err, data) {
          if (err) reject(err);
          else {
            const question = data.Items[0].question;
            let time_to_give = question_time["less"];
            if (
              question.split(" ").length > 15 &&
              question.split(" ").length <= 25
            ) {
              time_to_give = question_time["15"];
            } else if (
              question.split(" ").length > 25 &&
              question.split(" ").length <= 40
            ) {
              time_to_give = question_time["40"];
            } else if (
              question.split(" ").length > 40 &&
              question.split(" ").length <= 70
            ) {
              time_to_give = question_time["70"];
            } else if (question.split(" ").length > 70) {
              time_to_give = question_time["other"];
            }
            questions.push({
              id: data.Items[0].id,
              index: data.Items[0].index,
              question: data.Items[0].question,
              question_file: data.Items[0].path ? data.Items[0].path : "",
              type: data.Items[0].path ? "image" : "text",
              option1: data.Items[0].option1,
              option2: data.Items[0].option2,
              option3: data.Items[0].option3,
              option4: data.Items[0].option4,
              question_time: (data.Items[0].path || id == "77793c5f-5eae-4195-92b9-cc67a37a48a2")
                ? question_time["other"]
                : time_to_give,
            });
            if (questions.length == user_question_count) resolve(questions);
          }
        });
      }
    }
  });
};

const quizLeaderboardCooldownDetails = async (
  quiz_leaderboard_id,
  user_id,
  check_count
) => {
  let date = new Date();
  date = new Date(date.setHours(date.getHours() - 1)).getTime();
  let details = await quizLeaderboardDetailsModel
    .find({
      event_id: await getEventIdentifier(quiz_leaderboard_id),
      user_id: user_id,
      quiz_leaderboard_id: quiz_leaderboard_id,
      consider_quiz: true,
      timestamp: { $gt: date },
    })
    .sort({ timestamp: -1 })
    .exec();
  if (details.length >= check_count) {
    return {
      cooldown: true,
      recent_quiz_timestamp: details[0].timestamp,
    };
  } else {
    return {
      cooldown: false,
      recent_quiz_timestamp: "",
    };
  }
};

const updateQuizLeaderboardDetails = async (
  tracker_id,
  correct_answers_count
) => {
  await quizLeaderboardDetailsModel.findOneAndUpdate(
    {
      _id: tracker_id,
    },
    {
      result_declared: true,
      correct_answers_count: correct_answers_count,
    }
  );
};

const checkIfQuestionsRelatedToSameQuiz = async (data, tracker_id) => {
  return new Promise(async (resolve, reject) => {
    let total_records = Object.keys(data).length;
    for (const key in data) {
      const quiz_id = await getQuizIdByQuestionId(key);
      const quiz_leaderboard_event_id =
        await quizLeaderboardDetailsModel.findOne(
          { _id: tracker_id },
          { quiz_leaderboard_id: 1 }
        );
      if (quiz_leaderboard_event_id == null) {
        reject("Tracker Id not found");
      } else {
        const quiz_details = await getBattleFromBattleId(
          quiz_leaderboard_event_id.quiz_leaderboard_id
        );
        total_records = total_records - 1;
        if (total_records == 0) {
          resolve(true);
        }
        if (quiz_id.quiz_id == quiz_details.data[0].quiz_mapping_id) {
          continue;
        } else {
          resolve(false);
        }
      }
    }
  });
};

const getCorrectAnswerCount = async (data) => {
  let correct_answers_count = 0;
  let total_records = Object.keys(data).length;
  let records_completed = 0;
  return new Promise(async (resolve, reject) => {
    for (const key in data) {
      records_completed = records_completed + 1;
      const question_answer_data = await getQuestionAnswer(key).catch(
        async (error) => {
          reject(error);
        }
      );
      if (question_answer_data) {
        if (question_answer_data.correct_answer === data[key]) {
          correct_answers_count = correct_answers_count + 1;
        }
      }
      if (records_completed == total_records) {
        resolve(correct_answers_count);
      }
    }
  });
};

const isResultDeclared = async (tracker_id) => {
  const data = await quizLeaderboardDetailsModel.findOne(
    { _id: tracker_id },
    { result_declared: 1 }
  );
  return data.result_declared;
};

const getquizLeaderboardData = async (leaderboard_id, start_date, end_date) => {
  const data_query = quizLeaderboardDetailsModel.aggregate([
    { $match: { $and: [{ timestamp: { $gt: start_date, $lte: end_date }, quiz_leaderboard_id: leaderboard_id }] } },
    { $unwind: "$user_id" },
    { $group: { _id: ["$user_id", "$event_id"], count: { $sum: "$correct_answers_count" } } },
  ]);
  return new Promise(async (resolve, reject) => {
    data_query.exec(async function (err, data) {
      if (err) {
        reject(err);
      } else {
        const result = [];
        if (data.length === 0) {
          resolve({ data: result });
        }
        let task_to_complete = data.length
        let task_completed = 0
        data.map(async (item) => {
          const user_data = await getUserByUserId(item._id[0]);
          if(item.count != 0){
            result.push({
              user_id: item._id[0],
              correct_answer_count: item.count,
              current_user: false,
              username: user_data.length > 0 ? user_data[0].username : "",
              avatar:
                user_data.length > 0
                  ? user_data[0].avatar
                  : "https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
              registered_timestamp:
                user_data.length > 0 ? user_data[0].timestamp : +new Date(),
            });
            await redis.set(`quiz_leaderboard_score:${leaderboard_id}:${item._id[0]}`, JSON.stringify({
              user_id: item._id[0],
              correct_answer_count: item.count,
              current_user: false,
              username: user_data.length > 0 ? user_data[0].username : "",
              avatar:
                user_data.length > 0
                  ? user_data[0].avatar
                  : "https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
              registered_timestamp:
                user_data.length > 0 ? user_data[0].timestamp : +new Date(),
            }), {EX: 10800})
            }
            task_completed = task_completed + 1
            if (task_completed === task_to_complete) {
              result.sort((a, b) => (a.correct_answer_count < b.correct_answer_count ? 1 : -1));
              resolve({data: result});
              // resolve({
              //   data: result
              //     .sort((a, b) => (a.correct_answers_count < b.correct_answers_count ? 1 : -1))
              //     .sort(({ count: a }, { count: b }) => b - a);
              // });
            }
        });
      }
    });
  });
};

const getBots = async (quiz_leaderboard_id) => {
  let bots = await quizLeaderboardBotsDailyScoresModel.findOne({event_id: await getEventIdentifier(quiz_leaderboard_id), quiz_leaderboard_id: quiz_leaderboard_id});
  bots = Object.values(bots.bots)
  let arr = []
  for (let i = 0; i < bots.length; i++) {
    const user_data = await getUserByUserId(Object.keys(bots[[i]])[0]);
    arr.push({
      user_id: Object.keys(bots[[i]])[0],
      correct_answer_count: Object.values(bots[[i]])[0],
      current_user: false,
      username: user_data.length > 0 ? user_data[0].username : "",
      avatar:
        user_data.length > 0
          ? user_data[0].avatar
          : "https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
      registered_timestamp:
        user_data.length > 0 ? user_data[0].timestamp : +new Date(),
    });
  }
  await redis.set(`quiz_leaderboard_bots:${quiz_leaderboard_id}`, JSON.stringify(arr), {EX: 10800})
  return bots;
}

const updateBots = async (quiz_leaderboard_id) => {
  await quizLeaderboardBotsDailyScoresModel.updateOne({event_id: await getEventIdentifier(quiz_leaderboard_id), quiz_leaderboard_id: quiz_leaderboard_id}, {bots: [
    { "001fb2d6-af85-4f5f-a12a-80db6fc1a0a1": Math.floor(Math.random() * 250) + 1 },
    { "00c70a89-7d16-483f-9ec9-a0067e9608e6": Math.floor(Math.random() * 250) + 1 },
    { "00a1eaf7-c0c6-4279-a664-9a38ffb46424": Math.floor(Math.random() * 250) + 1 },
    { "0003bc38-d381-491b-82ce-947add3b31c9": Math.floor(Math.random() * 250) + 1 },
    { "000ea159-d828-43fa-afb5-f15092322490": Math.floor(Math.random() * 250) + 1 },
    { "016d7b47-141e-45ac-b4fd-79aaea3f53b8": Math.floor(Math.random() * 250) + 1 },
    { "0168b001-e57c-488f-883d-799905904668": Math.floor(Math.random() * 250) + 1 },
    { "01c3e5c7-68fa-410d-8f80-2e8da9f5e605": Math.floor(Math.random() * 250) + 1 },
    { "02c2f35d-b327-4795-8d5d-faf011b2e072": Math.floor(Math.random() * 250) + 1 },
    { "03bac2c6-b00c-4f10-9117-1b776e752351": Math.floor(Math.random() * 250) + 1 },
  ], timestamp: +new Date()}, {upsert: true});
  await redis.del(`quiz_leaderboard_bots:${quiz_leaderboard_id}`)
  return "done"
}

const saveQuizLeaderBoardData = async (
  quiz_leaderboard_id,
  start_date,
  ends_on,
  quiz_leaderboard_name
) => {
  let bots = await getBots(quiz_leaderboard_id);
  const data = await getquizLeaderboardData(quiz_leaderboard_id, start_date, ends_on).catch(
    async (error) => {
      console.log(error);
    }
  );
  if (data.data.length < 10) {
    for (let i = 0; i < bots.length; i++) {
      const user_data = await getUserByUserId(Object.keys(bots[[i]])[0]).catch(
        async (error) => {
          console.log(error);
        }
      );
      data.data.push({
        user_id: Object.keys(bots[[i]])[0],
        correct_answer_count: Object.values(bots[[i]])[0],
        current_user: false,
        username: user_data.length > 0 ? user_data[0].username : "",
        avatar:
          user_data.length > 0
            ? user_data[0].avatar
            : "https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
        registered_timestamp:
          user_data.length > 0 ? user_data[0].timestamp : +new Date(),
      });
      if (data.data.length === 10) {
        data.data
          .sort((a, b) =>
            a.registered_timestamp < b.registered_timestamp ? 1 : -1
          )
          .sort((a, b) => (a.correct_answer_count < b.correct_answer_count ? 1 : -1));
        const data_query = quizLeaderboardModel.updateOne(
          {
            event_id: await getEventIdentifier(quiz_leaderboard_id),
            quiz_leaderboard_id: quiz_leaderboard_id,
          },
          { $set: { quiz_leaderboard_data: data, updated_at: +new Date() } },
          { upsert: true }
        );
        data_query.exec(async function (err, data) {
          if (err) {
            console.log(err);
          } else {
            console.log(`${quiz_leaderboard_name} Data saved successfully!`);
          }
        });
      }
    }
  } else {
    const data_query = quizLeaderboardModel.updateOne(
      {
        event_id: await getEventIdentifier(quiz_leaderboard_id),
        quiz_leaderboard_id: quiz_leaderboard_id,
      },
      { $set: { quiz_leaderboard_data: data, updated_at: +new Date() } },
      { upsert: true }
    );
    data_query.exec(async function (err, data) {
      if (err) {
        reject(err);
      } else {
        console.log("Quiz Leaderboard Data saved successfully!");
      }
    });
  }
};

const getQuizLeaderboarAPIdData = async (leaderboard_id) => {
  const data_query = quizLeaderboardModel.findOne({
    quiz_leaderboard_id: leaderboard_id,
    event_id: await getEventIdentifier(leaderboard_id),
  });
  return new Promise(async (resolve, reject) => {
    data_query.exec(async function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

const quizLeaderboardResultDeclare = async (id, event_deatils) => {
  return new Promise(async (resolve, reject) => {
      const data = await getQuizLeaderboarAPIdData(id).catch(async (error) => {
        console.log(error);
      });
      if (data && !data.result_declare) {
        const top_results = data.quiz_leaderboard_data.data.slice(0, 3);
        top_results.map(async (item, index) => {
          let reward = rewards["first"];
          if (index === 1) {
            reward = rewards["second"];
          } else if (index === 2) {
            reward = rewards["thired"];
          }
          let old_axpi = await getUserAxPiByUserid(item.user_id);
          const coinUpdationParams = {
            TableName: tableUser,
            Key: { type: key.userType, id: item.user_id },
            UpdateExpression: "set coins = coins + :val",
            ExpressionAttributeValues: { ":val": parseInt(reward) },
            ReturnValues: "UPDATED_NEW",
          };
          docClient.update(
            coinUpdationParams,
            async function (coinUpdationErr, coinUpdationData) {
              if (coinUpdationErr) {
                console.log(coinUpdationErr);
              } else {
                const updateUserLeagueData = await updateUserLeague(
                  item.user_id,
                  coinUpdationData.Attributes.coins
                ).catch(async (updateUserLeagueError) => {
                  console.log(updateUserLeagueError);
                });
                if (updateUserLeagueData) {
                  let description = ''
                  switch(index + 1){
                    case 1:
                      description = `Your rank in ${event_deatils.name} is 1st and earned ${reward} ${event_deatils.rewardType}`
                      break;
                    case 2:
                      description = `Your rank in ${event_deatils.name} is 2nd and earned ${reward} ${event_deatils.rewardType}`
                      break;
                    case 3:
                      description = `Your rank in ${event_deatils.name} is 3rd and earned ${reward} ${event_deatils.rewardType}`
                      break;
                  }
                  const updated = await addUserCoinsHistory({
                    module: "quiz_leaderboard",
                    battle_id: event_deatils.id,
                    battle_name: event_deatils.name,
                    battle_image: event_deatils.path,
                    user_id: item.user_id,
                    entry_fee: event_deatils.entryFee,
                    entry_fee_type: event_deatils.entryFeeType,
                    reward_type: event_deatils.rewardType,
                    reward: reward,
                    coins: `+${reward}`,
                    description: description,
                    timestamp: +new Date(),
                  }).catch(async (err) => {
                    console.log(err);
                  });
                  if (updated) {
                    const data_query = quizLeaderboardModel.updateOne(
                      {
                        quiz_leaderboard_id: id,
                        event_id: await getEventIdentifier(id),
                      },
                      { $set: { result_declare: true } }
                    );
                    data_query.exec(async function (err, data) {
                      if (err) {
                        reject(err);
                      } else {
                        // Remove chache of coins
                        await deleteKeysByPrefix('coins_history:')
                        const cache_data2 = await redis.get(`withdraw:${item.user_id}`);
                        if(cache_data2) await redis.del(`withdraw:${item.user_id}`)
                        const cache_data3 = await redis.get(`home_v2:${item.user_id}`)
                        if(cache_data3) await redis.del(`home_v2:${item.user_id}`)
                        const cache_data4 = await redis.get(`user_details:${item.user_id}`)
                        if(cache_data4) await redis.del(`user_details:${item.user_id}`)
                        await isCheckpointCrossed(old_axpi, coinUpdationData.Attributes.coins, item.user_id)
                        console.log(`Result declare of ${event_deatils.name}, leaderboard id: ${id} and event id: ${await getEventIdentifier(id)}`);
                      }
                    });
                  }
                }
              }
            }
          );
        });
      }
    });
};

const updateStartEndDate = async (id, start_date, end_date) => {
  const params = {
    TableName: table,
    Key: { type: "Battle", id: id },
    UpdateExpression:
      "set #endsOn = :hkey,#battle_date=:hkey2",
    ExpressionAttributeNames: {
      "#battle_date": "battle_date",
      "#endsOn": "endsOn",
    },
    ExpressionAttributeValues: {
      ":hkey": end_date,
      ":hkey2": parseInt(start_date)
    },
  };
  return new Promise((resolve, reject) => {
    docClient.update(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

const updateConsiderQuizOfLastEntry = async (
  quiz_leaderboard_id,
  user_id
) => {
  let date = new Date();
  date = new Date(date.setHours(date.getHours() - 1)).getTime();
  let id = await quizLeaderboardDetailsModel
    .find({
      event_id: await getEventIdentifier(quiz_leaderboard_id),
      user_id: user_id,
      quiz_leaderboard_id: quiz_leaderboard_id,
      consider_quiz: true,
      timestamp: { $gt: date },
    }, {_id: 1})
    .sort({ timestamp: -1 }).limit(3)
    .exec();
  if(id){
    for(i=0; i<id.length; i++){
      await quizLeaderboardDetailsModel.findOneAndUpdate(
        {
          _id: id[i]['_id'],
        },
        {
          consider_quiz: false,
        }
      );
    }
  } else {
    throw new Error("Leaderboard id not found")
  }
};

const getQuizLeaderboardScore = async (
  leaderboard_id,
  user_id
) => {
  const data_query = quizLeaderboardDetailsModel.aggregate([
    { $match: { $and: [{ event_id: await getEventIdentifier(leaderboard_id), quiz_leaderboard_id: leaderboard_id, user_id: user_id }] } },
    { $unwind: "$user_id" },
    { $group: { _id: ["$user_id", "$event_id"], correct_answers_total_count: { $sum: "$correct_answers_count" } } },
  ]);
  return new Promise(async (resolve, reject) => {
    data_query.exec(async function (err, data) {
      if (err) {
        reject(err);
      } else {
        resolve(data.length!=0?data[0]['correct_answers_total_count']:0)
      }
    })
  })
};

const getTotalQuizPlayedInThisEvent = async (quiz_leaderboard_id, user_id) => {
  let total_day_count = await quizLeaderboardDetailsModel
    .find({
      event_id: await getEventIdentifier(quiz_leaderboard_id),
      user_id: user_id,
      quiz_leaderboard_id: quiz_leaderboard_id,
    }, {_id: 1})
    .count()
    .exec();
    return total_day_count;
};


const quizLeaderboardEligibilityCheck = async (quiz_leaderboard_id, user_id) => {
  const total_day_count = await getTotalQuizPlayedInThisEvent(quiz_leaderboard_id, user_id);
    if(total_day_count >= QUIZ_LEADERBOARD_EVENT_COUNT){
      return {
        "status": false,
        "message": `Every user can play this quiz ${QUIZ_LEADERBOARD_EVENT_COUNT} times in a whole quiz event. Please try other quiz.`
      }
    } else {
      return {
        "status": true,
        "message": ``
      }
    }
};

const getQuizLeaderboardId = async (tracker_id) => {
  const data = await quizLeaderboardDetailsModel.findOne(
    { _id: tracker_id },
    { quiz_leaderboard_id: 1 }
  );
  return data.quiz_leaderboard_id;
};

const updateQuizLeaderboardScoreInRedis = async (leaderboard_id, user_id, score) => {
  const cache_data_score = JSON.parse(await redis.get(`quiz_leaderboard_score:${leaderboard_id}:${user_id}`))
  if(cache_data_score){
    let current_score = cache_data_score['correct_answer_count'] + score
    cache_data_score['correct_answer_count'] = current_score
    await redis.set(`quiz_leaderboard_score:${leaderboard_id}:${user_id}`, JSON.stringify(cache_data_score), {EX: 3600})
  } else {
    const user_data = await getUserByUserId(user_id);
    await redis.set(`quiz_leaderboard_score:${leaderboard_id}:${user_id}`, JSON.stringify({
      user_id: user_id,
      correct_answer_count: score,
      current_user: false,
      username: user_data.length > 0 ? user_data[0].username : "",
      avatar:
        user_data.length > 0
          ? user_data[0].avatar
          : "https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
      registered_timestamp:
        user_data.length > 0 ? user_data[0].timestamp : +new Date(),
    }), {EX: 3600})
  }
};

const getQuizLeaderboarAPIdDataFromRedis = async (leaderboard_id) => {
  let users_array = await fetchKeysWithPrefix(`quiz_leaderboard_score:${leaderboard_id}`)
  let bots_array = JSON.parse(await redis.get(`quiz_leaderboard_bots:${leaderboard_id}`))
  if(!bots_array || bots_array.length == 0) {
    const event_data = await getBattleFromBattleId(leaderboard_id)
    let start_date = event_data.data[0].battle_date.toString()
    if((event_data.data[0].battle_date).toString().length === 7){
      start_date = "0"+(event_data.data[0].battle_date).toString()
    }
    start_date = +new Date(start_date.slice(2,4) + "/" + start_date.slice(0,2) + "/" + start_date.slice(4))
    const ends_on = event_data.data[0].endsOn
    const name = event_data.data[0].name
    await saveQuizLeaderBoardData(leaderboard_id, start_date, ends_on, name)
    users_array = await fetchKeysWithPrefix(`quiz_leaderboard_score:${leaderboard_id}`)
    bots_array = JSON.parse(await redis.get(`quiz_leaderboard_bots:${leaderboard_id}`))
  }
  if(users_array.length < 10){
    bots_array.sort((a, b) => b.correct_answer_count - a.correct_answer_count);
    bots_array = bots_array.slice(0, bots_array.length - users_array.length)
  }
  // Merge the two arrays
  const mergedArray = users_array.concat(bots_array);

  // Sort the merged array by correct_answer_count in descending order
  mergedArray.sort((a, b) => b.correct_answer_count - a.correct_answer_count);

  return mergedArray;
};

module.exports = {
  getQuizleaderboardQuestions,
  insertQuizLeaderboardDetails,
  quizLeaderboardCooldownDetails,
  updateQuizLeaderboardDetails,
  getCorrectAnswerCount,
  checkIfQuestionsRelatedToSameQuiz,
  isResultDeclared,
  saveQuizLeaderBoardData,
  quizLeaderboardResultDeclare,
  updateStartEndDate,
  getQuizLeaderboarAPIdData,
  updateConsiderQuizOfLastEntry,
  getQuizLeaderboardScore,
  getTotalQuizPlayedInThisEvent,
  quizLeaderboardEligibilityCheck,
  updateBots,
  getQuizLeaderboardId,
  updateQuizLeaderboardScoreInRedis,
  getQuizLeaderboarAPIdDataFromRedis
};
