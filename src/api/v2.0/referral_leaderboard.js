const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const { responseError, response } = require("../../models/response")
const { insertActivity } = require("../../models/activities")
const { getBattleFromBattleId, getUserByUserId, getBattlesFromSubCategory } = require('../../models');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { getReferralLeaderboardData, getReferralLeaderboarAPIdData } = require('../../models/referral_leaderboard');
const { adData } = require('../../models/external_ads');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
  });

// Get referral leaderboard data of live referral event

router.get('/', limiter, jwtAuth, check_domain_middleware, async (req, res) => {
    const data = await getReferralLeaderboarAPIdData(req.query.referral_leaderboard_id)
    const reward = {
        "first": "3000 AxPi",
        "second": "2000 AxPi",
        "thired": "1000 AxPi",
        "Note": "Priority will be given to the users who have registered first, if referrals are equal"
    }
    if(data){
        let rank = data.referral_data.data.findIndex(x => x.user_id === req.userData.user_id) + 1
        const top_results = data.referral_data.data.slice(0,10)
        const user_data = await getUserByUserId(req.userData.user_id);
        if(rank === 0){
            top_results.push({
                user_id: req.userData.user_id,
                referral_count: 0,
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
                    referral_count: data.referral_data.data[rank-1]['referral_count'],
                    rank: rank,
                    current_user: true,
                    username: user_data.length>0?user_data[0].username:"",
                    avatar: user_data.length>0?user_data[0].avatar:"https://tt-users-bucket.s3.ap-south-1.amazonaws.com/avatar/bot/5907.jpg",
                    registered_timestamp: user_data[0].timestamp
                })
            }
        }
        let refresh_at = new Date(data.updated_at)
        refresh_at.setMinutes(refresh_at.getMinutes() + 10 )
        refresh_at = refresh_at.getTime();
        const ad_data = await adData(req.userData.user_id, 17)
        res.status(200).json(await response({top_results, reward, refresh_at}, 200, "Data Retreived Successfully", ad_data));
    }
    else{
        res.status(200).json(await response({top_results: [], reward, refresh_at: 0}, 200, "Data Retreived Successfully"));
    }
})

module.exports = router;
