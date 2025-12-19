const express = require('express');
const router = express.Router();
const AWS = require('aws-sdk');
const jwtAuth = require('../../Auth/auth')
const { responseError, response } = require("../../models/response")
const { insertActivity } = require("../../models/activities")
const { putActivity } = require("../../Auth/activity_middleware")
const { getBattleQuestions, getQuestionAnswer, quiz_answer_coin_check, userCurrentQuizCount, getQuizPublishedStatus } = require("../../models/quiz");
const { getBattleFromBattleId, updateUserLeague, updateUserCoins, getUserCoinHistoryById, getEventCount, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber, getUserByUserId, isCheckpointCrossed } = require('../../models');
const { quizTrackerData } = require('../../models/tracker');
const { addUserCoinsHistory } = require('../../models/coins');
const keys = require('../../../config/keys')
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const userCoinsHistoryModel = require('../../db/modules/user_coins_history');
const { start_battle_coin_check } = require('../../models/start_battle');
const quizModel = require('../../db/modules/quizzes');
const { adData } = require('../../models/external_ads');
const { QUIZ_LIMIT_IN_A_DAY } = require('../../../config/constants');
const rateLimit = require("express-rate-limit");

AWS.config.update({
    region: keys.region,
    accessKeyId: keys.AWS_ACCESS_KEY,
    secretAccessKey: keys.AWS_SECRET_ACCESS_KEY
});

const tableUser = keys.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const number_of_questions_in_one_quiz = 5
const see_quiz_answer_fee = 1
const quiz_day_limit = QUIZ_LIMIT_IN_A_DAY

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
  });

// Get all the questions of a particular Battle ID

router.get('/questions', limiter, jwtAuth, check_domain_middleware, putActivity("questions", "Quiz started"), async (req, res) => {
    if(!await getQuizPublishedStatus(req.query.id))
        return res.status(405).json(await response({}, 405, `Quiz not published!`));
    if(await userCurrentQuizCount(req.query.id, req.userData.user_id)<quiz_day_limit){
        if(await start_battle_coin_check(req.query.id, req.userData.user_id)){
            const data = await getBattleQuestions(req.query.id).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "battle",
                    "Error occured in getBattleQuestions function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(data){
                const quiz_details = await getBattleFromBattleId(req.query.id).catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "battle",
                        "Error occured in getBattleFromBattleId function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                if(quiz_details){
                    const earning_limit_per_account = await getEventCount(req.query.id, req.userData.user_id)
                    if(quiz_details.data[0].earning_limit_per_account === -1 || quiz_details.data[0].earning_limit_per_account >= earning_limit_per_account){
                        if(keys.environment === "production"){
                            const coins_data = await updateUserCoins(req.userData.user_id, `-${quiz_details.data[0].entryFee}`).catch(async error => {
                                await insertActivity(
                                    req.userData.username,
                                    req.userData.user_id,
                                    "battle",
                                    "Error occured in updateUserAxPi function",
                                    req.url,
                                    error)
                                res.status(500).json(await responseError());
                            })
                            if(coins_data){
                                const league_data = await updateUserLeague(req.userData.user_id, coins_data.Attributes.coins).catch(async err=>{
                                    await insertActivity(
                                        req.userData.username,
                                        req.userData.user_id,
                                        "battle",
                                        "Error occured in updateUserLeague function",
                                        req.url,
                                        err)
                                        res.status(500).json(await responseError());
                                })
                                if(league_data){
                                    const coinUpdationParams = {
                                        TableName: tableUser,
                                        Key: { "type": keys.userType, "id": req.userData.user_id },
                                        UpdateExpression: "set quiz_participation = quiz_participation + :val",
                                        ExpressionAttributeValues: { ":val": 1 },
                                        ReturnValues: "UPDATED_NEW"
                                    }
                                    docClient.update(coinUpdationParams, async function (coinUpdationErr, coinUpdationData) {
                                        if (coinUpdationErr) {
                                            await insertActivity(
                                                req.userData.username,
                                                req.userData.user_id,
                                                "battle",
                                                "Error occured in updateUserLeague function",
                                                req.url,
                                                coinUpdationErr)
                                            res.status(500).json(await responseError());
                                        } else {
                                            const quizTracker = await quizTrackerData({
                                                quiz_id: req.query.id,
                                                user_id: req.userData.user_id,
                                                correct_answers_count: 0,
                                                total_questions_count: 5,
                                                timestamp: +new Date(),
                                                reward_type: quiz_details.data[0].rewardType,
                                                reward: 0,
                                                entry_fee_type: quiz_details.data[0].entryFeeType,
                                                entry_fee: quiz_details.data[0].entryFee,
                                            }).catch(async error => {
                                                await insertActivity(
                                                    req.userData.username,
                                                    req.userData.user_id,
                                                    "battle",
                                                    "Error occured in quizTrackerData function",
                                                    req.url,
                                                    error)
                                                res.status(500).json(await responseError());
                                            })
                                            if(quizTracker){
                                                let coin_data = {
                                                    module:"quiz",
                                                    battle_id: quiz_details.data[0].id,
                                                    battle_name: quiz_details.data[0].name,
                                                    battle_image: quiz_details.data[0].path,
                                                    user_id: req.userData.user_id,
                                                    entry_fee: quiz_details.data[0].entryFee,
                                                    entry_fee_type: quiz_details.data[0].entryFeeType,
                                                    reward_type: quiz_details.data[0].rewardType,
                                                    reward: 0,
                                                    coins: `+0`,
                                                    description: `You earn 0 AxPi for playing quiz`,
                                                    timestamp: +new Date()
                                                }
                                                const coin_history_data = await addUserCoinsHistory(coin_data).catch(async err=>{
                                                    await insertActivity(
                                                        req.userData.username,
                                                        req.userData.user_id,
                                                        "battle",
                                                        "Error occured in addUserAxPiHistory function",
                                                        req.url,
                                                        err)
                                                        res.status(500).json(await responseError());
                                                })
                                                if(coin_history_data){
                                                    await updateUserStatsCount(req.userData.user_id, "total_quiz_count")
                                                    await updateUserStatsCount(req.userData.user_id, `quiz_count.${req.query.id}`)
                                                    await updateOverAllCount(`quiz_count`)
                                                    await updateOverAllCount(`quizzes.${new Date().getFullYear()}.count`)
                                                    await updateOverAllCount(`quizzes.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                                    await updateOverAllCount(`quizzes.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                                    await updateOverAllCount(`quizzes.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                                    await updateOverAllCount(`quizzes.${req.query.id}.count`)
                                                    await updateOverAllCount(`quizzes.${req.query.id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                                    await updateOverAllCount(`quizzes.${req.query.id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                                    await updateOverAllCount(`quizzes.${req.query.id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                                    res.status(200).json(await response({quiz_questions: data, tracker_id: coin_history_data._id+":"+quizTracker._id}, 200, "Quiz Started"))
                                                }
                                            }
                                        }
                                    })
                                }
                            }
                        }
                        else {
                            const coinUpdationParams = {
                                TableName: tableUser,
                                Key: { "type": keys.userType, "id": req.userData.user_id },
                                UpdateExpression: "set quiz_participation = quiz_participation + :val",
                                ExpressionAttributeValues: { ":val": 1 },
                                ReturnValues: "UPDATED_NEW"
                            }
                            docClient.update(coinUpdationParams, async function (coinUpdationErr, coinUpdationData) {
                                if (coinUpdationErr) {
                                    await insertActivity(
                                        req.userData.username,
                                        req.userData.user_id,
                                        "battle",
                                        "Error occured in addUserAxPiHistory function",
                                        req.url,
                                        coinUpdationErr)
                                        res.status(500).json(await responseError());
                                } else {
                                    const quizTracker = await quizTrackerData({
                                        quiz_id: req.query.id,
                                        user_id: req.userData.user_id,
                                        correct_answers_count: 0,
                                        total_questions_count: 5,
                                        timestamp: +new Date(),
                                        reward_type: quiz_details.data[0].rewardType,
                                        reward: 0,
                                        entry_fee_type: quiz_details.data[0].entryFeeType,
                                        entry_fee: quiz_details.data[0].entryFee,
                                    }).catch(async error => {
                                        await insertActivity(
                                            req.userData.username,
                                            req.userData.user_id,
                                            "battle",
                                            "Error occured in quizTrackerData function",
                                            req.url,
                                            error)
                                        res.status(500).json(await responseError());
                                    })
                                    if(quizTracker){
                                        let coin_data = {
                                            module:"quiz",
                                            battle_id: quiz_details.data[0].id,
                                            battle_name: quiz_details.data[0].name,
                                            battle_image: quiz_details.data[0].path,
                                            user_id: req.userData.user_id,
                                            entry_fee: quiz_details.data[0].entryFee,
                                            entry_fee_type: quiz_details.data[0].entryFeeType,
                                            reward_type: quiz_details.data[0].rewardType,
                                            reward: 0,
                                            coins: `+0`,
                                            description: `You earn 0 AxPi for playing quiz`,
                                            timestamp: +new Date()
                                        }
                                        const coin_history_data = await addUserCoinsHistory(coin_data).catch(async err=>{
                                            await insertActivity(
                                                req.userData.username,
                                                req.userData.user_id,
                                                "battle",
                                                "Error occured in addUserAxPiHistory function",
                                                req.url,
                                                err)
                                                res.status(500).json(await responseError());
                                        })
                                        if(coin_history_data){
                                            await updateUserStatsCount(req.userData.user_id, "total_quiz_count")
                                            await updateUserStatsCount(req.userData.user_id, `quiz_count.${req.query.id}`)
                                            await updateOverAllCount(`quiz_count`)
                                            await updateOverAllCount(`quizzes.${new Date().getFullYear()}.count`)
                                            await updateOverAllCount(`quizzes.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                                            await updateOverAllCount(`quizzes.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                                            await updateOverAllCount(`quizzes.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                                            res.status(200).json(await response({quiz_questions: data, tracker_id: coin_history_data._id+":"+quizTracker._id}, 200, "Quiz Started"))
                                        }
                                    }
                                }
                            })
                        }
                    }
                    else{
                        res.status(405).json(await response({}, 405, `You have earned a lot from this quiz. Try another quiz now!`));
                    }
                }
            }
        }
        else{
            res.status(405).json(await response({}, 405, "Do not have enough AxPi"));
        }
    }
    else{
        res.status(405).json(await response({}, 405, `You can play this quiz ${quiz_day_limit} times in 24 hours. Try another quiz!`));
    }
})

router.get('/questions/correct_ans', limiter, jwtAuth, check_domain_middleware, putActivity("correct answer", "Seeing Quiz Answer"), async (req, res) => {
    if(await quiz_answer_coin_check(see_quiz_answer_fee, req.userData.user_id)){
        const data = await getQuestionAnswer(req.query.question_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "battle",
                "Error occured in getQuestionAnswer function",
                req.url,
                error)
            res.status(500).json(await responseError());
        })
        if(data){
            // if(keys.environment === "production"){
            //     const coins_data = await updateUserCoins(req.userData.user_id, `-${see_quiz_answer_fee}`).catch(async error => {
            //         await insertActivity(
            //             req.userData.username,
            //             req.userData.user_id,
            //             "battle",
            //             "Error occured in updateUserAxPi function",
            //             req.url,
            //             error)
            //         res.status(500).json(await responseError());
            //     })
            //     if(coins_data){
            //         const league_data = await updateUserLeague(req.userData.user_id, coins_data.Attributes.coins).catch(async err=>{
            //             await insertActivity(
            //                 req.userData.username,
            //                 req.userData.user_id,
            //                 "battle",
            //                 "Error occured in updateUserLeague function",
            //                 req.url,
            //                 err)
            //                 res.status(500).json(await responseError());
            //         })
            //         if(league_data){
            //             const tracker_id = req.query.tracker_id
            //             const user_coin_history_id = tracker_id.split(":")[0]
            //             const quiz_tracker_id = tracker_id.split(":")[1]
            //             const user_coins_history_data = await getUserCoinHistoryById(user_coin_history_id);
            //             const user_coins_history_reward = user_coins_history_data.reward - see_quiz_answer_fee;
            //             const data_to_update = userCoinsHistoryModel.updateOne({"_id": user_coin_history_id}, {$set: {"reward": user_coins_history_reward}, "coins": `${user_coins_history_reward}`, "description": `You lost ${Math.abs(user_coins_history_reward)} Coins for playing quiz` })
            //             const tracker_update = quizModel.updateOne({"_id": quiz_tracker_id},{ $set: { "reward": user_coins_history_reward} })
            //             data_to_update.exec(async function (err, data) {
            //                 if (err) {
            //                     await insertActivity(
            //                         req.userData.username,
            //                         req.userData.user_id,
            //                         "quiz (see answer)",
            //                         "Error occured in updating user coin history",
            //                         req.url,
            //                         err)
            //                     res.status(500).json(await responseError());
            //                 }
            //             })
            //             tracker_update.exec(async function (err, data) {
            //                 if (err) {
            //                     await insertActivity(
            //                         req.userData.username,
            //                         req.userData.user_id,
            //                         "quiz (see answer)",
            //                         "Error occured in updating quiz tracker",
            //                         req.url,
            //                         err)
            //                     res.status(500).json(await responseError());
            //                 }
            //             })
            //             res.status(200).json(await response(data, 200, "AxPi Deducted for seeing answer"));
            //         }
            //     }
            // }
            // else {
                res.status(200).json(await response(data, 200, "Answer retreived successfully"));
            // }
        }
    }
    else{
        res.status(402).json(await response({}, 402, "Do not have enough AxPi"));
    }
});

router.post('/result', limiter, jwtAuth, check_domain_middleware, putActivity("Quiz Result", "Quiz result declared"), async (req, res) => {
    if(req.query.quiz_id && !await getQuizPublishedStatus(req.query.quiz_id))
        return res.status(405).json(await response({}, 405, `Quiz not published!`));
    const user_details = await getUserByUserId(req.userData.user_id)
    const quiz_id = req.query.quiz_id
    const tracker_id = req.query.tracker_id
    const answers = req.body.answers
    const user_coin_history_id = tracker_id.split(":")[0]
    const quiz_tracker_id = tracker_id.split(":")[1]
    const user_coin_history_data = await getUserCoinHistoryById(user_coin_history_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "quiz",
            "Error occured in getQuestionAnswer function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(quiz_id && tracker_id && user_coin_history_data.reward === 0){
        if(Object.keys(answers).length === 0){
            res.status(200).json(await response({
                correct_answers_count: 0,
                wrong_answers_count: 0,
                view_answer_count: number_of_questions_in_one_quiz,
                quiz_result_percentage: 0,
                quiz_result_message: "Needs Improvement!",
                quiz_result_color: "#E30404"},
            200,
            "Result Declared"
        ));
        }
        let total_questions_count = Object.keys(answers).length
        let correct_answers_count = 0
        let wrong_answers_count = 0
        for (const key in answers) {
            const data = await getQuestionAnswer(key).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "quiz",
                    "Error occured in getQuestionAnswer function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(data){
                if(data.correct_answer === answers[key]){
                    correct_answers_count = correct_answers_count + 1
                }
                else{
                    wrong_answers_count = wrong_answers_count + 1
                }
            }
        }
        const quiz_details = await getBattleFromBattleId(quiz_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "quiz",
                "Error occured in getBattleFromBattleId function",
                req.url,
                error)
            res.status(500).json(await responseError());
        })
        if(quiz_details){
            const one_correct_answer_reward_coin = parseInt(quiz_details.data[0].reward)/number_of_questions_in_one_quiz
            let coin_rewarded = correct_answers_count * one_correct_answer_reward_coin
            // const view_answer_count = parseInt(req.query.view_answer_count)
            const view_answer_count = 0
            let data_to_update = userCoinsHistoryModel.updateOne({"_id": user_coin_history_id},{ $set: { "reward": coin_rewarded, "coins": `+${coin_rewarded}`, "description": `You earn ${coin_rewarded} ${quiz_details.data[0].entryFeeType} for playing quiz` } })
            if(view_answer_count > 0 && coin_rewarded <= view_answer_count){
                coin_rewarded = coin_rewarded - view_answer_count
                if(coin_rewarded < 0){
                    data_to_update = userCoinsHistoryModel.updateOne({"_id": user_coin_history_id},{ $set: { "reward": coin_rewarded, "coins": `-${Math.abs(coin_rewarded)}`, "description": `You lost ${Math.abs(coin_rewarded)} ${quiz_details.data[0].entryFeeType} for playing quiz` } })
                }
                else{
                    data_to_update = userCoinsHistoryModel.updateOne({"_id": user_coin_history_id},{ $set: { "reward": coin_rewarded, "coins": `+${Math.abs(coin_rewarded)}`, "description": `You earn ${Math.abs(coin_rewarded)} ${quiz_details.data[0].entryFeeType} for playing quiz` } })
                }
            }
            else if(view_answer_count > 0 && coin_rewarded > view_answer_count){
                coin_rewarded = coin_rewarded - view_answer_count
                data_to_update = userCoinsHistoryModel.updateOne({"_id": user_coin_history_id},{ $set: { "reward": coin_rewarded, "coins": `+${Math.abs(coin_rewarded)}`, "description": `You earn ${Math.abs(coin_rewarded)} ${quiz_details.data[0].entryFeeType} for playing quiz` } })
            }
            let tracker_update = quizModel.updateOne({"_id": quiz_tracker_id},{ $set: { "correct_answers_count": correct_answers_count, "reward": coin_rewarded} })
            if(keys.environment === "production"){
                let coins_data = await updateUserCoins(req.userData.user_id, coin_rewarded).catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "quiz",
                        "Error occured in updateUserAxPi function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                if(coins_data){
                    let league_data = await updateUserLeague(req.userData.user_id, coins_data.Attributes.coins).catch(async err=>{
                        await insertActivity(
                            req.userData.username,
                            req.userData.user_id,
                            "quiz",
                            "Error occured in updateUserLeague function",
                            req.url,
                            err)
                            res.status(500).json(await responseError());
                    })
                    if(league_data){
                            data_to_update.exec(async function (err, data) {
                                if (err) {
                                    await insertActivity(
                                        req.userData.username,
                                        req.userData.user_id,
                                        "quiz",
                                        "Error occured in updating user AxPi history",
                                        req.url,
                                        err)
                                    res.status(500).json(await responseError());
                                }
                            })
                            tracker_update.exec(async function (err, data) {
                                if (err) {
                                    await insertActivity(
                                        req.userData.username,
                                        req.userData.user_id,
                                        "quiz",
                                        "Error occured in updating quiz tracker",
                                        req.url,
                                        err)
                                    res.status(500).json(await responseError());
                                }
                            })
                            let quiz_result_percentage = parseInt((correct_answers_count/total_questions_count)*100)
                            let quiz_result_message = "Good Job!"
                            let quiz_result_color = "#2BEA00"
                            if(quiz_result_percentage > 40 && quiz_result_percentage <= 70){
                                quiz_result_message = "Nice but you can do better!"
                                quiz_result_color = "#DEC402"
                            }
                            else if(quiz_result_percentage <= 40){
                                quiz_result_message = "Needs Improvement!"
                                quiz_result_color = "#E30404"
                            }
                            const previous_axpi = user_details[0].coins
                            const updated_axpi = parseInt(previous_axpi) + parseInt(coin_rewarded)
                            const ad_data = await adData(req.userData.user_id, 16);
                            const checkpoint_data = await isCheckpointCrossed(previous_axpi, updated_axpi, req.userData.user_id)
                            return res.status(200).json(await response({
                                    correct_answers_count,
                                    wrong_answers_count: wrong_answers_count - parseInt(req.query.view_answer_count),
                                    view_answer_count: parseInt(req.query.view_answer_count),
                                    quiz_result_percentage: quiz_result_percentage,
                                    quiz_result_message, quiz_result_color,
                                    previous_axpi,
                                    updated_axpi
                                },
                                200,
                                "Result Declared",
                                ad_data,
                                checkpoint_data
                            ));
                        }
                    }
                }
            else {
                data_to_update.exec(async function (err, data) {
                    if (err) {
                        await insertActivity(
                            req.userData.username,
                            req.userData.user_id,
                            "quiz",
                            "Error occured in updating user AxPi history",
                            req.url,
                            err)
                            res.status(500).json(await responseError());
                    }
                })
                tracker_update.exec(async function (err, data) {
                    if (err) {
                        await insertActivity(
                            req.userData.username,
                            req.userData.user_id,
                            "quiz",
                            "Error occured in updating quiz tracker",
                            req.url,
                            err)
                        res.status(500).json(await responseError());
                    }
                })
                let quiz_result_percentage = parseInt((correct_answers_count/total_questions_count)*100)
                    let quiz_result_message = "Good Job!"
                    let quiz_result_color = "#2BEA00"
                    if(quiz_result_percentage > 40 && quiz_result_percentage <= 70){
                        quiz_result_message = "Nice but you can do better!"
                        quiz_result_color = "#DEC402"
                    }
                    else if(quiz_result_percentage <= 40){
                        quiz_result_message = "Needs Improvement!"
                        quiz_result_color = "#E30404"
                    }
                    const previous_axpi = user_details[0].coins
                    const updated_axpi = parseInt(previous_axpi) + parseInt(coin_rewarded)
                    const ad_data = await adData(req.userData.user_id, 16);
                    const checkpoint_data = await isCheckpointCrossed(previous_axpi, updated_axpi, req.userData.user_id)
                    res.status(200).json(await response({
                        correct_answers_count,
                        wrong_answers_count: wrong_answers_count - parseInt(req.query.view_answer_count),
                        view_answer_count: parseInt(req.query.view_answer_count),
                        quiz_result_percentage: quiz_result_percentage,
                        quiz_result_message, quiz_result_color,
                        previous_axpi,
                        updated_axpi
                    },
                    200,
                    "Result Declared",
                    ad_data,
                    checkpoint_data
                ));
            }
        }
    }
    else{
        res.status(502).json({ message: "Not Allowed"});
    }
});

router.get('/answer', limiter, jwtAuth, check_domain_middleware, async (req, res) => {
    try{
        const data = await getQuestionAnswer(req.query.question_id);
        res.status(200).json(await response(data, 200, "Answer Fetched Successfully"));
    } catch (e) {
        console.log(e)
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/answer",
            "Error occured in /answer route",
            req.url,
            err)
        res.status(500).json(await responseError());
    }
})

module.exports = router;
