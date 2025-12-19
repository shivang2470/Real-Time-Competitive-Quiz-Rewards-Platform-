const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const auth = require('../../Auth/api_key_auth')
const rateLimit = require("express-rate-limit");
const { responseError, response } = require("../../models/response")
const { getHomeData, report_battle, getBattleDetail, getVotersDetail, live_battles_without_bots, old_battles_without_bots_and_results, updateBattleReportedCount } = require("../../models/home")
const { search_live_battle } = require("../../models/search")
const { insertActivity } = require("../../models/activities")
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { userDetail } = require('../../models/user_detail');
const { getUserBalance } = require('../../models');
const { adData } = require('../../models/external_ads');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

const ttls = {xtra_small: 300, very_small: 3600, small: 14400, medium: 28800, large: 86400}

router.get('/live_battles', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    if (req.query.username) {
        let limit = 8
        let page = 1
        if(req.query.limit && req.query.page){
            limit = parseInt(req.query.limit)
            page = parseInt(req.query.page)
        }
        const searchBattleData = await search_live_battle( req.query.username, parseInt(page), parseInt(limit)).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "home",
                    "Error occured in search_live_battle function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            });
        if(searchBattleData){
            res.status(200).json(await response(searchBattleData, 200, "Searching data retrieved successfully"))
        }
    }
    else {
        const homeData = await getHomeData( req.userData, req.query.category_id, req.query.sub_category_id, parseInt(req.query.limit), req.query.last_timestamp).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "home",
                    "Error occured in getHomeData function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
        if(homeData){
            res.status(200).json(await response(homeData, 200, "Home data retrieved successfully"))
        }
    }
})

// Depricated (GET-/report_battle_options)
router.get('/report_battle_options', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const reports = [
        "First Player is fake",
        "Second Player is fake",
        "Battle File is showing adult content",
        "First Player getting fake votes",
        "Second Player getting fake votes",
        "Image is not related to this Battle",
        "Battle information is not right",
        "Other"
    ]
    res.status(200).json(await response(reports, 200, "Report data retrieved successfully"));
})

router.post('/report_battle', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const item = {
        reporter_user_id: req.userData.user_id,
        reporter_username: req.userData.username,
        reported_battle_id: req.body.reported_battle_id,
        report_option: req.body.report_option,
        timestamp: +new Date()
    }
    if (req.body.remark) {
        item.remark = req.body.remark
    }
    const reportUpdateData = await report_battle(item).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "home",
            "Error occured in report_battle function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(reportUpdateData){
        const count_updated = await updateBattleReportedCount(req.body.reported_battle_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "home",
                "Error occured in updateBattleReportedCount function",
                req.url,
                error)
            res.status(500).json(await responseError());
        })
        if(count_updated){
            res.status(200).json(await response({}, 200, "Report data added successfully"))
        }
    }
})

router.get('/battle_details', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const battle_details = await getBattleDetail(req.query.id, req.userData.user_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "home",
            "Error occured in getBattleDetail function",
            req.url,
            error)
        res.status(402).json(await responseError());
    })
    if(battle_details){
        const ad_data = await adData(req.userData.user_id, 4);
        res.status(200).json(await response(battle_details, 200, "Battle details data retrieved successfully", ad_data));
    }
})

router.get('/voters_detail', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const voter_details = await getVotersDetail( req.query.id, req.query.user_id, parseInt(req.query.last_timestamp), parseInt(req.query.limit)).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "home",
            "Error occured in getBattleDetail function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(voter_details){
        const ad_data = await adData(req.userData.user_id, 5);
        res.status(200).json(await response(voter_details, 200, "Voters details data retrieved successfully", ad_data))
    }
})

router.get('/live_battles_without_bots', limiter, auth, async (req, res) => {
    const battles_details = await live_battles_without_bots().catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Socket",
            "Error occured in live_battle_without_bots function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(battles_details){
        res.status(200).json(await response(battles_details, 200, "Live battles detail data retrieved successfully"))
    }
})

router.get('/old_battles_without_bots_and_results', auth, async (req, res) => {
    const battles_details = await old_battles_without_bots_and_results().catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Socket",
            "Error occured in live_battle_without_bots function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(battles_details){
        res.status(200).json(await response(battles_details, 200, "Old battles detail data retrieved successfully"))
    }
})

router.get('/coin_mismatch_result', limiter, async (req, res) => {
    const balance = await getUserBalance(req.query.user_id).catch(async error => {
        console.log(error)
        res.status(500).json(await responseError());
    })
    const user_info = await userDetail(req.query.user_id).catch(async error => {
        console.log(error)
        res.status(500).json(await responseError());
    })
    res.status(200).json(await response({calculated_coins: balance, saved_coins: user_info.Item.coins}, 200, "Data retrieved successfully"));
})

module.exports = router;
