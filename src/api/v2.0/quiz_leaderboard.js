const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const { responseError, response } = require("../../models/response")
const { insertActivity } = require("../../models/activities")
const { getBattleFromBattleId, getUserByUserId, getBattlesFromSubCategory, updateUserStatsCount, updateOverAllCount, getCurrentWeekNumber } = require('../../models');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { getReferralLeaderboardData, getReferralLeaderboarAPIdData } = require('../../models/referral_leaderboard');
const { adData } = require('../../models/external_ads');
const { insertQuizLeaderboardDetails, getQuizleaderboardQuestions, quizLeaderboardCooldownDetails, updateQuizLeaderboardDetails, getCorrectAnswerCount, checkIfQuestionsRelatedToSameQuiz, isResultDeclared, getQuizLeaderboarAPIdData, updateConsiderQuizOfLastEntry, getQuizLeaderboardScore, getTotalQuizPlayedInThisEvent, quizLeaderboardEligibilityCheck, getQuizLeaderboardId, updateQuizLeaderboardScoreInRedis, getQuizLeaderboarAPIdDataFromRedis } = require('../../models/quiz_leaderboard');
const { QUIZ_LEADERBOARD_TOTAL_QUESTIONS, QUIZ_LEADERBOARD_COOLDOWND_COUNT, QUIZ_LEADERBOARD_EVENT_COUNT } = require('../../../config/constants');
const { putActivity } = require('../../Auth/activity_middleware');
const { addQuizLeaderboardWatchAddTrackerData, getQuizLeaderboardWatchAddTrackerData, updatequizLeaderboardWatchAddTrackerDataTrue } = require('../../models/tracker');
const key = require('../../../config/keys');
const { addUserCoinsHistory } = require('../../models/coins');
const rateLimit = require("express-rate-limit");
const { redis } = require('../../models/redis');
const { getQuizPublishedStatus } = require('../../models/quiz');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
  });

router.get('/details', limiter, jwtAuth, check_domain_middleware, putActivity("quiz_leaderboard_details", "Quiz Leaderboard Detail"), async (req, res) => {
    try{
        const cache_data = await redis.get(`quiz_leaderboard_detail:${req.query.event_id}:${req.userData.user_id}`)
        if(cache_data){
            const ad_data = await adData(req.userData.user_id, 18)
            return res.status(200).json(await response(JSON.parse(cache_data), 200, "Data Retreived Successfully", ad_data));
        }
        const data = await getBattleFromBattleId(req.query.event_id)
        const cooldown_details = await quizLeaderboardCooldownDetails(data.data[0].id, req.userData.user_id, QUIZ_LEADERBOARD_COOLDOWND_COUNT);
        const score = await getQuizLeaderboardScore(req.query.event_id, req.userData.user_id);
        if(data){
            const faqs =  [
                    {
                        "question": `What is ${data.data[0].name}?`,
                        "answer": `${data.data[0].name} is a live quiz contest where users can participate and earn there positions in the leaderboard`
                    },
                    {
                        "question": "How does it works?",
                        "answer": `Participants have to participate in ${data.data[0].name} and give correct answers as much as possible.`
                    },
                    {
                        "question": "This Live event is for how many days?",
                        "answer": "This event will last for 5 days"
                    },
                    {
                        "question": "How results will be declared for the leaderboard?",
                        "answer": "After ending event, around 11:35 PM result will be declared and rewards will be distributed."
                    },
                    {
                        "question": "What is a cooldown period?",
                        "answer": "Users can play 3 quizzes in 1 hour (Cooldown period)"
                    },
                    {
                        "question": "How rank will be decided if scores are equal?",
                        "answer": "If scores are equal, priority will be given to the users who have registered first"
                    },
                    {
                        "question": "How rewards will be distributed?",
                        "answer": `User who achieve 1st position in ${data.data[0].name} will receive 200 Axpi, for second position 100 AxPi and for thired position user will receive 50 AxPi.`
                    }
                ]
            const ad_data = await adData(req.userData.user_id, 18)
            const total_day_count = await getTotalQuizPlayedInThisEvent(req.query.event_id, req.userData.user_id);
            const statement = `Play ${data.data[0].name}, 5 days event starts from 12:20 AM and ends at 11:30 PM after 5 days. Be on the top of the leaderboard to get rewards. You can play this quiz ${QUIZ_LEADERBOARD_EVENT_COUNT - total_day_count} times more in this 5 day event.`
            const response_data = {faqs, score: score, reward: data.data[0].reward, reward_type: data.data[0].rewardType, quiz_name: `${data.data[0].name}`, statement: statement, cooldown_details}
            await redis.set(`quiz_leaderboard_detail:${req.query.event_id}:${req.userData.user_id}`, JSON.stringify(response_data), {EX: 21600})
            return res.status(200).json(await response(response_data, 200, "Data Retreived Successfully", ad_data));
        }
    } catch (e) {
        console.log(e)
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/details",
            "Error occured in /details route",
            req.url,
            e)
        res.status(500).json(await responseError("Something went wrong"));
    }
})

router.get('/questions', limiter, jwtAuth, check_domain_middleware, putActivity("quiz_leaderboard_questions", "Quiz Leaderboard Questions"), async (req, res) => {
    try{
        if(!await getQuizPublishedStatus(req.query.event_id))
            return res.status(405).json(await response({}, 405, `Quiz event ended or not started!`));
        const eligibity_creteria = await quizLeaderboardEligibilityCheck(req.query.event_id, req.userData.user_id);
        if(eligibity_creteria['status']){
            const cooldown_details = await quizLeaderboardCooldownDetails(req.query.event_id, req.userData.user_id, QUIZ_LEADERBOARD_COOLDOWND_COUNT);
            if(cooldown_details.cooldown){
                res.status(405).json(await response({cooldown_details}, 405, "Quiz Leaderboard Cooldown. Watch Ad to get more quiz to play"));
            } else {
                const data = await getBattleFromBattleId(req.query.event_id)
                const quiz_detail_data = await insertQuizLeaderboardDetails(req.query.event_id, req.userData.user_id, QUIZ_LEADERBOARD_TOTAL_QUESTIONS)
                const questions = await getQuizleaderboardQuestions(data.data[0].quiz_mapping_id, QUIZ_LEADERBOARD_TOTAL_QUESTIONS)
                    await updateUserStatsCount(req.userData.user_id, "total_quiz_leaderboard_count")
                    await updateUserStatsCount(req.userData.user_id, `quiz_leaderboard_count.${req.query.event_id}`)
                    await updateOverAllCount(`quiz_leaderboard_count`)
                    await updateOverAllCount(`quiz_leaderboard.${new Date().getFullYear()}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${req.query.event_id}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${req.query.event_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${req.query.event_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                    await updateOverAllCount(`quiz_leaderboard.${req.query.event_id}.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                res.status(200).json(await response({questions, tracker_id: quiz_detail_data._id}, 200, "Data Retreived Successfully"));
            }
        } else {
            res.status(405).json(await response({}, 405, eligibity_creteria['message']));
        }
    } catch (e) {
        console.log(e)
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/questions",
            "Error occured in /questions route",
            req.url,
            e)
        res.status(500).json(await responseError("Something went wrong"));
    }
})

router.post('/result', limiter, jwtAuth, check_domain_middleware, putActivity("quiz_leaderboard_quiz_result", "Quiz Leaderboard Quiz Result"), async (req, res) => {
    if(!req.query.tracker_id || !req.body.answers){
        return res.status(405).json(await response({}, 405, "Tracker Id and Answers are required"));
    } else {
        try {
            if(await isResultDeclared(req.query.tracker_id)){
                const quiz_leaderboard_id = await getQuizLeaderboardId(req.query.tracker_id);
                const correct_answer_count = await getCorrectAnswerCount(req.body.answers);
                const ad_data = await adData(req.userData.user_id, 19);
                await redis.del(`quiz_leaderboard_detail:${quiz_leaderboard_id}:${req.userData.user_id}`)
                await redis.del(`quiz_leaderboard_top_ranks:${quiz_leaderboard_id}`)
                return res.status(200).json(await response({score: correct_answer_count}, 200, "Result declared", ad_data));
            } else if(await checkIfQuestionsRelatedToSameQuiz(req.body.answers, req.query.tracker_id) == false){
                return res.status(405).json(await response({}, 405, "Something went wrong"));
            }
            else {
                const quiz_leaderboard_id = await getQuizLeaderboardId(req.query.tracker_id);
                const correct_answer_count = await getCorrectAnswerCount(req.body.answers);
                await updateQuizLeaderboardDetails(req.query.tracker_id, correct_answer_count);
                const ad_data = await adData(req.userData.user_id, 19);
                await redis.del(`quiz_leaderboard_detail:${quiz_leaderboard_id}:${req.userData.user_id}`)
                await redis.del(`quiz_leaderboard_top_ranks:${quiz_leaderboard_id}`)
                await updateQuizLeaderboardScoreInRedis(quiz_leaderboard_id, req.userData.user_id, correct_answer_count)
                return res.status(200).json(await response({score: correct_answer_count}, 200, "Result Declared Successfully", ad_data));
            }
        } catch (e) {
            console.log(e)
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "/result",
                "Error occured in /result route",
                req.url,
                e)
            return res.status(500).json(await responseError("Something went wrong"));
        }
    }
})


// Get quiz leaderboard data of live event

router.get('/', limiter, jwtAuth, check_domain_middleware, putActivity("quiz_leaderboard", "Opening Quiz Leaderboard"), async (req, res) => {
    // const cache_data = await redis.get(`quiz_leaderboard_top_ranks:${req.query.leaderboard_id}`)
    // if(cache_data){
    //     const ad_data = await adData(req.userData.user_id, 20)
    //     return res.status(200).json(await response(JSON.parse(cache_data), 200, "Data Retreived Successfully", ad_data));
    // }
    const data = await getQuizLeaderboarAPIdDataFromRedis(req.query.leaderboard_id)
    const leaderboard_data = await getQuizLeaderboarAPIdData(req.query.leaderboard_id)
    const reward = {
        "first": "200 AxPi",
        "second": "100 AxPi",
        "thired": "50 AxPi",
        "Note": "Priority will be given to the users who have registered first, if scores are equal"
    }
    if(data){
        let rank = data.findIndex(x => x.user_id === req.userData.user_id) + 1
        const top_results = data.slice(0,10)
        const user_data = await getUserByUserId(req.userData.user_id);
        if(rank === 0){
            top_results.push({
                user_id: req.userData.user_id,
                correct_answer_count: 0,
                current_user: true,
                rank: "Unranked",
                username: user_data.length>0?user_data[0].username:"",
                avatar: user_data.length>0?user_data[0].avatar:"https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
                registered_timestamp: user_data[0].timestamp
            })
        }
        else{
            if(rank <= 10){
                top_results[rank-1]['user_id'] = req.userData.user_id
                top_results[rank-1]['current_user'] = true
                top_results[rank-1]['username'] = user_data.length>0?user_data[0].username:""
                top_results[rank-1]['avatar'] = user_data.length>0?user_data[0].avatar:"https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
                top_results[rank-1]['registered_timestamp'] = user_data[0].timestamp
            }
            else{
                top_results.push({
                    user_id: req.userData.user_id,
                    correct_answer_count: data[rank-1]['correct_answer_count'],
                    rank: rank,
                    current_user: true,
                    username: user_data.length>0?user_data[0].username:"",
                    avatar: user_data.length>0?user_data[0].avatar:"https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
                    registered_timestamp: user_data[0].timestamp
                })
            }
        }
        let refresh_at = new Date(leaderboard_data.updated_at)
        refresh_at.setMinutes(refresh_at.getMinutes() + parseInt(key.quiz_leaderboard_refresh_time) )
        refresh_at = refresh_at.getTime();
        const response_data = {top_results, reward, refresh_at}
        // await redis.set(`quiz_leaderboard_top_ranks:${req.query.leaderboard_id}`, JSON.stringify(response_data), {EX: 21600})
        const ad_data = await adData(req.userData.user_id, 20)
        return res.status(200).json(await response(response_data, 200, "Data Retreived Successfully", ad_data));
    }
    else{
        return res.status(200).json(await response({top_results: [], reward, refresh_at: 0}, 200, "Data Retreived Successfully"));
    }
})

router.get('/watch_ad/watch_ad_count', limiter, check_domain_middleware, jwtAuth, putActivity("Quiz Leaderboard Watch Ads", "Started watching ad of quiz leaderboard"), async (req, res) => {
    try{
        const addWatchAdData = await addQuizLeaderboardWatchAddTrackerData({
            user_id: req.userData.user_id,
            timestamp: +new Date()
        }).catch(async err => {
            console.log(err)
            res.status(500).json(await responseError());
        })
        if (addWatchAdData) {
            res.status(200).json(await response({ tracker_id: addWatchAdData._id }, 200, `Watch Full video to play extra quiz`))
        }
    } catch(e){
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/watch_ad_count",
            "Error occured in /watch_ad_count route",
            req.url,
            e)
        res.status(500).json(await responseError());
    }
})

router.get('/watch_ad/result', limiter, check_domain_middleware, jwtAuth, putActivity("Quiz Leaderboard Watch Ad", "Quiz Leadeerboard Ad Watched"), async (req, res) => {
    try{
        if (!req.query.tracker_id || !req.query.leaderboard_id) {
            res.status(400).json(await response({}, 405, "Tracker id or leaderboard id not found"))
        }
        else {
            let watch_ad_event_id = key.quiz_leaderboard_watch_ad_event_id
            if (req.query.watch_ad_event_id) {
                watch_ad_event_id = req.query.watch_ad_event_id
            }
            const tarcker_data = await getQuizLeaderboardWatchAddTrackerData(req.query.tracker_id)
            if (!tarcker_data['ad_watched']) {
                await updatequizLeaderboardWatchAddTrackerDataTrue(req.query.tracker_id);
                const data = await getBattleFromBattleId(watch_ad_event_id);
                if (data) {
                    let coin_data = {
                        module: "quiz_leaderboard_watch_ad",
                        battle_id: data.data[0].id,
                        battle_name: data.data[0].name,
                        battle_image: data.data[0].path,
                        user_id: req.userData.user_id,
                        entry_fee: data.data[0].entryFee,
                        entry_fee_type: data.data[0].entryFeeType,
                        reward_type: data.data[0].rewardType,
                        reward: data.data[0].reward,
                        coins: `+${data.data[0].reward}`,
                        description: `Rewarded three more chance to play quiz in this hour`,
                        timestamp: +new Date()
                    }
                    const updated = await addUserCoinsHistory(coin_data);
                    if (updated) {
                        await redis.del(`quiz_leaderboard_detail:${req.query.leaderboard_id}:${req.userData.user_id}`)
                        await updateConsiderQuizOfLastEntry(req.query.leaderboard_id, req.userData.user_id)
                        await updateUserStatsCount(req.userData.user_id, "quiz_leaderboard_watch_ad_count")
                        await updateOverAllCount(`quiz_leaderboard_watch_ad_count`)
                        await updateOverAllCount(`quiz_leaderboard_ads.${new Date().getFullYear()}.count`)
                        await updateOverAllCount(`quiz_leaderboard_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.count`)
                        await updateOverAllCount(`quiz_leaderboard_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.week_${getCurrentWeekNumber()}.count`)
                        await updateOverAllCount(`quiz_leaderboard_ads.${new Date().getFullYear()}.month_${new Date().getMonth()}.date_${new Date().getDate()}.count`)
                        res.status(200).json(await response({}, 200, `Rewarded three more chance to play quiz in this hour`))
                    }
                }
            }
            else {
                res.status(400).json(await response({}, 405, "Not Allowed"))
            }
        }
    } catch (e) {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "/result",
            "Error occured in /result watch ad route",
            req.url,
            e)
        res.status(500).json(await responseError());
    }
})

module.exports = router;
