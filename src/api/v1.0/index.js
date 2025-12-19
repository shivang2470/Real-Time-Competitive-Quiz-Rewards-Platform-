const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const api_key_auth = require('../../Auth/start_battle_auth')
const { response, responseError } = require("../../models/response")
const rateLimit = require("express-rate-limit");
const { insertActivity } = require("../../models/activities")
const { userDetail } = require("../../models/user_detail");
const {
    getCategories,
    getSubCategories,
    getAllBattles,
    getInstructions,
    getBattleFromBattleId,
    getBattlesFromSubCategory,
    getBattlesFromCategory,
    getUserBattleByBattleId,
    getUsers,
    getUserBalance,
    updateUserCoins,
    updateUserLeague,
    search_battle_facts,
    usernameNotExists,
    suggestusername,
    addFeaturePermission
} = require("../../models/index");
const { register_bot, get_bot } = require('../../models/start_battle');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { addUserCoinsHistory } = require('../../models/coins');
const { basicAuth } = require('../../Auth/basic_auth');
const {redis} = require('../../models/redis');
const { getRandomBot, createConnectionForBot } = require('../../models/bots_battle');
const keys = require('../../../config/keys');
const { get } = require('request');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

const usernameLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 50,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});


// Get current user
router.get('/current_user', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_key = `${req.originalUrl}/${req.userData.user_id}`
    const cache_data = await redis.get(cache_key);
    if ( cache_data == undefined ){
        const user = await userDetail(req.userData.user_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "battle",
                "Error occured in userDetail function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
        if(user){
            req.userData.avatar = user.Item.avatar
            req.userData.name = user.Item.name
            const data_to_send = await response(req.userData, 200, "User data retrieved successfully")
            await redis.set(cache_key, JSON.stringify(data_to_send), {EX: 3600});
            return res.status(200).json(data_to_send);
        }
    }
    else{
        return res.status(200).json(JSON.parse(cache_data));
    }
})

// Get all the categories with its data
router.get('/category', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_key = `${req.originalUrl}`
    const cache_data = await redis.get( cache_key );
    if ( cache_data == undefined ){
        const data = await getCategories(req.query.page, req.query.limit).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "home",
                "Error occured in getCategories function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
        if(data){
            await redis.set(cache_key, JSON.stringify(data), {EX: 3600});
            return res.status(200).json(data)
        }
    }
    else{
        return res.status(200).json(JSON.parse(cache_data))
    }
})

// Get all the sub-categories from particular category id
router.get('/subcategory', limiter, jwtAuth, check_domain_middleware, async (req, res) => {
    const cache_key = `${req.originalUrl}`
    const cache_data = await redis.get( cache_key );
    if ( cache_data == undefined ){
        const data = await getSubCategories(req.query.page, req.query.limit, req.query.category_id, req.userData.user_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "battle",
                "Error occured in getSubCategories function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
        if(data){
            const indexOfObject = data.data.findIndex(object => {
                return object.id === "fe63fe9d-0319-4723-ac33-b68ca8754714";
            });
            if(indexOfObject !== -1){
                data.data.splice(indexOfObject, 1)
            }
            await redis.set(cache_key, JSON.stringify(data), {EX: 3600});
            return res.status(200).json(data)
        }
    }
    else{
        return res.status(200).json(JSON.parse(cache_data))
    }
})

// Get all battles in socket server
router.get('/socket/battles/', api_key_auth, async (req, res) => {
    const data = await getAllBattles().catch(async error => {
        await insertActivity(
            "Unknown",
            "Unknown",
            "battle",
            "Error occured in getAllBattles function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(data){
        res.status(200).json(data)
    }
})

// Get Battles from Id or Instruction of battle or Battle from subcategory Id or Battle from category Id

router.get('/battles', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const cache_key = `${req.originalUrl}`
    const cache_data = await redis.get( cache_key );
    if ( cache_data == undefined ){
        if (req.query.instructions) {
            const data = await getInstructions(req.query.id).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "battle instruction",
                    "Error occured in getInstructions function",
                    req.url,
                    error)
                return res.status(500).json(await responseError());
            })
            if(data){
                await redis.set(cache_key, JSON.stringify(data), {EX: 28800});
                return res.status(200).json(data)
            }
        }
        else if (req.query.battle) {
            const data = await getBattleFromBattleId(req.query.id).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "battle",
                    "Error occured in getBattleFromBattleId function",
                    req.url,
                    error)
                return res.status(500).json(await responseError());
            })
            if(data){
                await redis.set(cache_key, JSON.stringify(data), {EX: 28800});
                return res.status(200).json(data)
            }
        }
        else if (req.query.subcategory) {
            const data = await getBattlesFromSubCategory(req.query.page, req.query.limit, req.query.id, req.userData.user_id).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "battle",
                    "Error occured in getBattlesFromSubCategory function",
                    req.url,
                    error)
                return res.status(500).json(await responseError());
            })
            if(data){
                await redis.set(cache_key, JSON.stringify(data), {EX: 28800});
                return res.status(200).json(data)
            }
        }
        else if (req.query.category) {
            const data = await getBattlesFromCategory(req.query.page, req.query.limit, req.query.id).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "battle",
                    "Error occured in getBattlesFromCategory function",
                    req.url,
                    error)
                return res.status(500).json(await responseError());
            })
            if(data){
                await redis.set(cache_key, JSON.stringify(data), {EX: 28800});
                return res.status(200).json(data)
            }
        }
        else {
            const data = await getAllBattles(req.query.page, req.query.limit).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "battle",
                    "Error occured in getAllBattles function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(data){
                await redis.set(cache_key, JSON.stringify(data), {EX: 28800});
                return res.status(200).json(data)
            }
        }
    }
    else{
        return res.status(200).json(JSON.parse(cache_data))
    }
})

// Get particular battle from battle id

router.get('/user_battle/:id', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const data = await getUserBattleByBattleId(req.params.id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "battle",
            "Error occured in getUserBattleByBattleId function",
            req.url,
            error)
    })
    if(data){
        res.status(200).json(await response(data, 200, "Battle retrieved successfully"))
    }
});

// Register bot in socket server
router.post('/register/bot', api_key_auth, async (req, res) => {
    const data = await register_bot(req.body.bot_data, req.body.battle_id).catch(async error => {
        console.log(error)
        res.status(500).json(await responseError());
    })
    if(data){
        res.status(200).json(data)
    }
})

router.get('/user_balance_calculator', api_key_auth, async (req, res) => {
    const users = await getUsers().catch(async error => {
        console.log(error)
        res.status(500).json(await responseError());
    })
    if(users){
        const task_to_complete = users.length
        const user_balance = []
        users.map(async (item)=>{
            const balance = await getUserBalance(item.id).catch(async error => {
                    console.log(error)
                    res.status(500).json(await responseError());
                })
            user_balance.push({
                balance, 
                user_id: item.id, 
                username: item.username,
                coins: item.coins
            })
            if(task_to_complete === user_balance.length){
                res.status(200).json(await response(
                    user_balance, 200, "Data Retrieved Successfully"
                ))
            }
        })
    }
})

router.post('/user_coins', api_key_auth, async (req, res) => {
    if(req.body.credit === "true" || req.body.credit === true){
        const data = await updateUserCoins(req.body.user_id, req.body.entry_fee)
        await updateUserLeague(req.body.user_id, data.Attributes.coins)
    }
    const coinHistoryUpdate1 = await addUserCoinsHistory({
        module:"battle_blocked",
        battle_id: req.body.battle_id, 
        battle_name: req.body.battle_name,
        battle_image: req.body.battle_image,
        user_id: req.body.user_id,
        entry_fee: req.body.entry_fee,
        entry_fee_type: req.body.entry_fee_type,
        reward_type: req.body.reward_type,
        reward: req.body.reward,
        coins: req.body.coins,
        description: req.body.description,
        timestamp: req.body.timestamp
    }).catch(async err => {
        res.status(500).json({error: err})
    })
    if(coinHistoryUpdate1){
        res.status(200).json(await response(
            {}, 200, "Data Added Successfully"
        ))
    }
})

router.get('/battle_search/facts', jwtAuth, async (req, res) => {
    const data = await search_battle_facts().catch(async err => {
        res.status(500).json({error: err})
    });
    if(data){
        res.status(200).json(await response(
            data, 200, "Data Retreived Successfully!"
        ))
    }
})

// Check username exists

router.get('/username/validate', usernameLimiter, check_domain_middleware, async (req, res) => {
    const data = await usernameNotExists(req.query.username).catch(async (data)=>{
        if(data.status_code === 500){
            await insertActivity(
                req.query.username,
                "Unknown",
                "register",
                "Error in usernameNotExists function",
                req.url,
                data.message);
            res.status(500).json(await responseError())
        }
        else if(data.status_code === 409){
            const suggested_usernames = await suggestusername(req.query.username)
            res.status(data.status_code).json(await response(suggested_usernames, data.status_code, data.message))
        }
    })
    if(data){
        res.status(200).json(await response({}, 200, "Username Validation Success"))
    }
});

// Add feature permission

router.post('/feature_permission', basicAuth, async (req, res) => {
    const data = await addFeaturePermission({
        user_id: req.body.user_id,
        feature_permission_settings_id: req.body.feature_permission_settings_id,
        timestamp: +new Date()
    })
    res.status(200).json(await response({data}, 200, "Feature Permission Added Successfully"))
});

// Create Random Bot Battle

router.post('/create_user_bot_battle', jwtAuth, async (req, res) => {
    const battle_id = req.body.battle_id;
    if(!battle_id){
        return res.status(412).json(await response({}, 412, "Battle Id is required"))
    }
    let bot = await getRandomBot();
    const battle_details = await getBattleFromBattleId(battle_id);
    console.log(battle_details)
    while(1){
        if(parseInt(bot.coins) < parseInt(battle_details['data'][0].entryFee)){
            bot = await getRandomBot();
        } else {
            break;
        }
    }
    let file = bot.avatar
    if(battle_id != keys.dp_battle_id){
        file = await get_bot(battle_id)
    }
    await createConnectionForBot({
        module: "random_search",
        action: "message",
        user_id: bot.id,
        battle_id: battle_id,
        battle_file: file
    })
    return res.status(200).json(await response({
        user_id: bot.id,
        battle_id: battle_id,
        battle_file: file,
        axpi: bot.coins
      }, 200, "Bot connection created successfully!"))
});

module.exports = router;
