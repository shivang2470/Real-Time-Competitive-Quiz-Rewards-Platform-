const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const { insertActivity } = require("../../models/activities")
const { responseError, response } = require("../../models/response")
const { putActivity } = require("../../Auth/activity_middleware");
const { getSettings, updateUserCoins, updateUserLeague, getUserBalance, updateUserAxPiRomp, getBattleFromBattleId, checkCheckpoint, isCheckpointCrossed, userCheckpoints, insertRewardedCheckPointData } = require('../../models');
const { addUserCoinsHistory } = require('../../models/coins');
const { getRedemption, insertRedemptionRequest, getTransactions, getRedemptionDetails, getWalletBalance, updateWalletBalance, insertWalletStatements, getWalletId, getWalletStatements, insertGiftCardOrders, insertTopUpOrders, responseTopUpData, getWalletOrders, responseOrderData, insertExternalTransfers, updateExternalTransfers, transactionAllowed, getLastTransactionId } = require('../../models/redemption');
const { userDetail } = require('../../models/user_detail');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
// const { user_coins_not_matches_notifications } = require('../../models/slack_templets');
const { adData } = require('../../models/external_ads');
const { createErrorLog } = require('../../models/log_creation');
const { getIndiaAirtimeOperators, getGiftCards, orderGiftCard, orderTopuUp, getAllOperators, getAllLocationsForOperator, getAllPlansFromOperatorId, getCronServerIndiaAirtimeOperators, getCronServerOperators, getCronServerOperatorLocations, getCronServerOperatorByOperatorId } = require('../../models/reloadly');
const constants = require('../../../config/constants');
const {redis} = require('../../models/redis');
const rateLimit = require("express-rate-limit");
const api_key_auth = require('../../Auth/api_key_auth');

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 20,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
});

router.post('/request', check_domain_middleware, jwtAuth, putActivity("redemption", "Redemption Request"), async (req, res) => {
    if(process.env.redemption_accepted === "false" || process.env.redemption_accepted === false){
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "redemption",
            "New Redemption request is coming but can not accepted",
            req.url,
            `Due to Financial guidelines. Currently, we are not accepting redemption requests. We will continue redemption requests after ${process.env.days_of_not_accepted} days`)
        res.status(405).json(await response({}, 405, `Due to Financial guidelines. Currently, we are not accepting redemption requests. We will continue redemption requests after ${process.env.days_of_not_accepted} days`))
    }
    else{
        const settings = await getSettings().catch(async err => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "redemption",
                "Error occured in getSettings function",
                req.url,
                err)
            res.status(500).json(await responseError());
        })
        if(settings){
            let user = await userDetail(req.userData.user_id).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "redemption",
                    "Error occured in userDetail function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(user){
                user = user.Item
                if(req.body.redeemed_coins > user.coins){
                    res.status(405).json(await response({}, 405, `You do not have ${req.body.redeemed_coins} AxPi to redeem`))
                }
                else if(req.body.redeemed_coins > user.coins - settings.minimum_coins){
                    res.status(405).json(await response({}, 405, `You can not able to redeem all AxPi. You can redeem maximum ${user.coins - settings.minimum_coins} AxPi.`))
                }
                else if(req.body.redeemed_coins < settings.minimum_redeem_coins){
                    res.status(405).json(await response({}, 405, `You can redeem ${settings.minimum_redeem_coins} or above AxPi.`))
                }
                else{
                    const redemption_data = await getRedemption().catch(async error => {
                        await insertActivity(
                            req.userData.username,
                            req.userData.user_id,
                            "redemption",
                            "Error occured in getRedemption function",
                            req.url,
                            error)
                        res.status(500).json(await responseError());
                    })
                    if(redemption_data){
                        // const random_coin_values = [0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057, 0.058, 0.059, 0.060, 0.061, 0.062,
                        // 0.063, 0.064, 0.065, 0.066, 0.067, 0.068, 0.069, 0.070, 0.071, 0.072, 0.073, 0.074, 0.075, 0.076, 0.077, 0.078, 0.079,
                        // 0.080, 0.081, 0.082, 0.083, 0.084, 0.085, 0.086, 0.087, 0.088, 0.089, 0.090, 0.091, 0.092, 0.093, 0.094, 0.095, 0.096,
                        // 0.097, 0.098, 0.099, 0.1, 0.11, 0.12, 0.13, 0.14, 0.15, 0.16, 0.17, 0.18, 0.19, 0.20, 0.21]
                        // const random_coin_values = [0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057, 0.058, 0.059, 0.060, 0.061, 0.062,
                        // 0.063, 0.064, 0.065, 0.066, 0.067, 0.068, 0.069, 0.070, 0.071, 0.072, 0.073, 0.074, 0.075, 0.076, 0.077, 0.078, 0.079,
                        // 0.080, 0.081, 0.082, 0.083, 0.084, 0.085, 0.086, 0.087, 0.088, 0.089, 0.090, 0.091, 0.092, 0.093, 0.094, 0.095, 0.096,
                        // 0.097, 0.098, 0.099, 0.1]
                        // const random_coin_values = [0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057, 0.058, 0.059, 0.060, 0.061, 0.062,
                        // 0.063, 0.064, 0.065, 0.066, 0.067, 0.068, 0.069, 0.070, 0.071, 0.072, 0.073, 0.074, 0.075, 0.076, 0.077, 0.078, 0.079,
                        // 0.080, 0.081, 0.082, 0.083, 0.084, 0.085, 0.086, 0.087, 0.088, 0.089, 0.090]
                        const random_coin_values = [0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057, 0.058, 0.059, 0.060, 0.061, 0.062,
                            0.063, 0.064, 0.065, 0.066, 0.067, 0.068, 0.069, 0.070]
                        const coin_value = random_coin_values[Math.floor(Math.random() * random_coin_values.length)];
                        const reward  = parseFloat(parseFloat(coin_value) * parseInt(req.body.redeemed_coins)).toFixed(2)
                        const redemption_selected_option = req.body.redemption_option
                            const id = await insertRedemptionRequest(req.userData.user_id, req.body.redeemed_coins, redemption_selected_option, req.body.payment_mode, req.body.payment_mode_value, parseFloat(reward).toFixed(2)).catch(async error => {
                                await insertActivity(
                                    req.userData.username,
                                    req.userData.user_id,
                                    "redemption",
                                    "Error occured in insertRedemptionRequest function",
                                    req.url,
                                    error)
                                res.status(500).json(await responseError());
                            })
                            if(id){
                                const item = {
                                    module:"redemption",
                                    battle_id: redemption_data.id,
                                    battle_name: "Redemption",
                                    battle_image: redemption_data.image_url,
                                    user_id: req.userData.user_id,
                                    entry_fee: req.body.redeemed_coins,
                                    reward_type: redemption_selected_option,
                                    reward: parseFloat(reward).toFixed(2),
                                    coins: `-${req.body.redeemed_coins}`,
                                    description: `You will receive ${parseFloat(reward).toFixed(2)} ${redemption_selected_option} in 3 working days`,
                                    redemption_request_id: id,
                                    timestamp: +new Date()
                                }
                                if(req.body.payment_mode == "paytm"){
                                    item.description = `You will receive ${parseFloat(reward).toFixed(2)} ${redemption_selected_option} in 20 working days`
                                }
                                const data2 = await addUserCoinsHistory(item).catch(async error => {
                                    await insertActivity(
                                        req.userData.username,
                                        req.userData.user_id,
                                        "redemption",
                                        "Error occured in addUserAxPiHistory function",
                                        req.url,
                                        error)
                                    res.status(500).json(await responseError());
                                })
                            if(data2){
                                const data3 = await updateUserCoins(req.userData.user_id, `-${req.body.redeemed_coins}`).catch(async error => {
                                    await insertActivity(
                                        req.userData.username,
                                        req.userData.user_id,
                                        "redemption",
                                        "Error occured in updateUserAxPi function",
                                        req.url,
                                        error)
                                    res.status(500).json(await responseError());
                                })
                                if(data3){
                                    const data4 = await updateUserLeague(req.userData.user_id, data3.Attributes.coins).catch(async error => {
                                        await insertActivity(
                                            req.userData.username,
                                            req.userData.user_id,
                                            "redemption",
                                            "Error occured in updateUserLeague function",
                                            req.url,
                                            error)
                                        res.status(500).json(await responseError());
                                    })
                                    if(data4){
                                        await insertRewardedCheckPointData(req.userData.user_id, 6, 1550, 1550, true);
                                        const ad_data = await adData(req.userData.user_id, 11);
                                        res.status(200).json(await response({id}, 200, "Redemption request is successful", ad_data))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
})

router.get('/withdraw', limiter, check_domain_middleware, jwtAuth, putActivity("withdraw", "Withdraw page"), async (req, res) => {
    const cache_key = `withdraw:${req.userData.user_id}`
    const data_to_send_from_cache = await redis.get(cache_key);
    if(data_to_send_from_cache){
        const ad_data = await adData(req.userData.user_id, 9);
        return res.status(200).json(await response(JSON.parse(data_to_send_from_cache), 200, "Withdraw data retrieved successfully", ad_data)) 
    }
    const settings = await getSettings().catch(async err => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "redemption",
            "Error occured in getSettings function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    })
    if(settings){
        let user = await userDetail(req.userData.user_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "withdraw",
                "Error occured in userDetail function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
        if(user){
            user = user.Item
            const available_amount = (parseFloat(settings.coin_value).toFixed(2) * parseFloat(user.coins).toFixed(2))
            let withdrawable_amount  = available_amount - (settings.minimum_coins * settings.coin_value)
            if(withdrawable_amount < 0){
                withdrawable_amount = 0
            }
            const available_coins = user.coins
            const withdrawable_coins  = withdrawable_amount / settings.coin_value
            const minimum_payout_amount = settings.minimum_redeem_coins * settings.coin_value
            let user_payout_reach_percentage = 0
            if(withdrawable_amount >= minimum_payout_amount){
                user_payout_reach_percentage = 100
            }
            else{
                user_payout_reach_percentage = (withdrawable_amount/minimum_payout_amount) * 100
            }
            const redemption_data = await getRedemption().catch(async err => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "redemption",
                    "Error occured in getRedemption function",
                    req.url,
                    err)
                return res.status(500).json(await responseError());
            })
            if(redemption_data){
                // const balance = await getUserBalance(req.userData.user_id).catch(async error => {
                //     console.log(error)
                //     res.status(500).json(await responseError());
                // })
                // const user_info = await userDetail(req.userData.user_id).catch(async error => {
                //     console.log(error)
                //     res.status(500).json(await responseError());
                // })
                // if(balance && user_info){
                //     if(balance !== user_info.Item.coins){
                //         axios.post(keys.apk_error_notifications_slack_url,
                //         await user_coins_not_matches_notifications(process.env.ENVIRONMENT, req.userData.username, req.userData.user_id, user_info.Item.coins, balance))
                //         .then(response => {
                //             if (response.status == 200) {
                //                 console.log("Salck Message Sent!");
                //             }
                //         })
                //     }
                // }
                const ad_data = await adData(req.userData.user_id, 9);
                await insertRewardedCheckPointData(req.userData.user_id, 1, 0, 100, true);
                const res_data = {
                    available_amount: parseFloat(parseFloat(available_amount).toFixed(2)),
                    withdrawable_amount: parseFloat(parseFloat(withdrawable_amount).toFixed(2)),
                    available_coins,
                    withdrawable_coins: parseFloat(parseFloat(withdrawable_coins).toFixed(2)),
                    user_payout_reach_percentage: parseFloat(parseFloat(user_payout_reach_percentage).toFixed(2)),
                    minimum_payout_amount: parseFloat(parseFloat(minimum_payout_amount).toFixed(2)),
                    instructions: redemption_data.instructions,
                    one_coin_value: settings.coin_value,
                    checkpoints: constants.CHECKPOINTS,
                    checkpoint_id: await checkCheckpoint(available_coins),
                    user_checkpoints: await userCheckpoints(req.userData.user_id)
                }
                await redis.set(cache_key, JSON.stringify(res_data), {EX: 86400})
                return res.status(200).json(await response(res_data, 200, "Withdraw data retrieved successfully", ad_data))
            }
        }
    }
})

// Not using
router.get('/transactions', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const data = await getTransactions(req.userData.user_id, req.query.page, parseInt(req.query.limit)).catch(async error => {
        const pushError = await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "transactions",
            "Error occured in getTransactions function",
            req.url,
            error)
        if(pushError){
            res.status(500).json(await responseError())
        }
    })
    if(data){
        data.data.map(async item=>{
            if(typeof item.payment_mode_value !== 'object'){
                let past_value = item.payment_mode_value
                item.payment_mode_value={
                    "ifsc_code": "",
                    "account_number": past_value,
                    "owner_name": ""
                }
            }
        })
        res.status(200).json(await response(data, 200, "Transaction data retrieved successfully"))
    }
})

router.get('/details', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    const data = await getRedemptionDetails(req.query.redemption_request_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "transactions",
            "Error occured in getRedemptionDetails function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(data){
        if(typeof data.payment_mode_value !== 'object'){
            let past_value = data.payment_mode_value
            data.payment_mode_value={
                "ifsc_code": "",
                "account_number": past_value,
                "owner_name": ""
            }
        }
        const ad_data = await adData(req.userData.user_id, 11);
        res.status(200).json(await response(data, 200, "Redemption detail data retrieved successfully", ad_data))
    }
})


router.post('/axpi_romp', check_domain_middleware, jwtAuth, putActivity("redemption", "Axpi Romp Redemption"), async (req, res) => {
    const settings = await getSettings().catch(async err => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "redemption",
            "Error occured in getSettings function",
            req.url,
            err)
        res.status(500).json(await responseError());
    })
    if(settings){
        let user = await userDetail(req.userData.user_id).catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "redemption",
                "Error occured in userDetail function",
                req.url,
                error)
            res.status(500).json(await responseError());
        })
        if(user){
            user = user.Item
            const old_axpi = user.coins
            const total_axpi_romp = user.axpi_romp?user.axpi_romp:1000
            if(req.body.redeemed_axpi_romp > total_axpi_romp){
                res.status(405).json(await response({}, 405, `You do not have ${req.body.redeemed_axpi_romp} AxPi Romp to convert`))
            }
            else if(req.body.redeemed_axpi_romp > total_axpi_romp - 1000){
                res.status(405).json(await response({}, 405, `You can not convert all AxPi Romp. You can convert maximum ${total_axpi_romp - 1000} AxPi Romp.`))
            }
            else if(req.body.redeemed_axpi_romp < 10000){
                res.status(405).json(await response({}, 405, `You can convert 10000 or above AxPi Romp.`))
            }
            else{
                const redemption_data = await getBattleFromBattleId("4a68ea44-932f-4106-92a4-f93566c5c02c").catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "redemption",
                        "Error occured in getBattleFromBattleId function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                const reward = parseInt((parseFloat(redemption_data.data[0].reward/redemption_data.data[0].entryFee).toFixed(2)) * parseFloat(req.body.redeemed_axpi_romp).toFixed(2))
                await updateUserAxPiRomp(req.userData.user_id, `-${req.body.redeemed_axpi_romp}`).catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "redemption",
                        "Error occured in updateUserAxPiRomp function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                const updateAxpi = await updateUserCoins(req.userData.user_id, `+${reward}`).catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "redemption",
                        "Error occured in updateUserAxPiRomp function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                await updateUserLeague(req.userData.user_id, updateAxpi.Attributes.coins).catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "redemption",
                        "Error occured in updateUserLeague function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                const item = {
                    module:"axpi_romp_conversion",
                    battle_id: redemption_data.data[0].id,
                    battle_name: redemption_data.data[0].name,
                    battle_image: redemption_data.data[0].path,
                    user_id: req.userData.user_id,
                    entry_fee: req.body.redeemed_axpi_romp,
                    entry_fee_type: redemption_data.data[0].entryFeeType,
                    reward_type: redemption_data.data[0].rewardType,
                    reward: reward,
                    coins: `+${reward}`,
                    axpi_romp: `-${req.body.redeemed_axpi_romp}`,
                    description: `${req.body.redeemed_axpi_romp} ${redemption_data.data[0].entryFeeType} Converted to ${reward} ${redemption_data.data[0].rewardType}`,
                    timestamp: +new Date()
                }
                await addUserCoinsHistory(item).catch(async error => {
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "redemption",
                        "Error occured in addUserAxPiHistory function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                const checkpoint_data = await isCheckpointCrossed(old_axpi, old_axpi + reward, req.userData.user_id)
                return res.status(200).json(await response({}, 200, "Successfully converted AxPi Romp to AxPi", null, checkpoint_data))
            }
        }
    }
})

router.get('/axpi_romp_details', limiter, check_domain_middleware, jwtAuth, putActivity("axpi_romp_details", "AxPi Romp details page"), async (req, res) => {
    const cache_key = `axpi_romp_details:${req.userData.user_id}`
    const data_to_send_from_cache = await redis.get(cache_key);
    if(data_to_send_from_cache){
        const ad_data = await adData(req.userData.user_id, 9);
        return res.status(200).json(await response(JSON.parse(data_to_send_from_cache), 200, "AxPi Romp conversion data retrieved successfully", ad_data)) 
    }
    let user = await userDetail(req.userData.user_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "axpi_romp_details",
            "Error occured in userDetail function",
            req.url,
            error)
        return res.status(500).json(await responseError());
    })
    if(user){
        const redemption_data = await getBattleFromBattleId("4a68ea44-932f-4106-92a4-f93566c5c02c").catch(async error => {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "axpi_romp_details",
                "Error occured in getBattleFromBattleId function",
                req.url,
                error)
            return res.status(500).json(await responseError());
        })
        user = user.Item
        const available_axpi_romp = user.axpi_romp?user.axpi_romp:1000
        let withdrawable_axpi_romp  = available_axpi_romp - 1000
        if(withdrawable_axpi_romp < 0) {
            withdrawable_axpi_romp = 0
        }
        const res_data = {
            available_axpi_romp,
            withdrawable_axpi_romp,
            instructions: redemption_data.data[0].instructions
        }
        await redis.set(cache_key, JSON.stringify(res_data), {EX: 86400})
        const ad_data = await adData(req.userData.user_id, 9);
        return res.status(200).json(await response(res_data,
            200,
            "AxPi Romp conversion data retrieved successfully", ad_data
        ))
    }
})

router.get('/wallet', limiter, check_domain_middleware, jwtAuth, putActivity("wallet", "Fetching Wallet Balance"), async (req, res) => {
    try{
        const cache_key = `wallet:${req.userData.user_id}`
        const data_to_send_from_cache = await redis.get(cache_key);
        if(data_to_send_from_cache){
            return res.status(200).json(await response(JSON.parse(data_to_send_from_cache), 200, "Wallet Balance retrieved successfully")) 
        }
        const balance = await getWalletBalance(req.userData.user_id);
        const walletId = await getWalletId(req.userData.user_id);
        const instructions = "You can withdraw money from your wallet at any time.\nWithdrawal amount should be atleast 10 Rupees.\nAmount can take 20 days to get reflected in your given bank account.\nYou can earn more by participating in various events.\nPlease mail us at support@talentitan.com if you have any query regarding withdraw."
        const res_data = {balance, wallet_id: walletId, instructions}
        await redis.set(cache_key, JSON.stringify(res_data), {EX: 86400})
        return res.status(200).json(await response(res_data, 200, "Wallet Balance retrieved successfully"))
    } catch (err) {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "redemption",
            "Error occured in redemption api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.post('/wallet', limiter, check_domain_middleware, jwtAuth, putActivity("wallet", "Withdraw AxPi to TalenTitan Wallet"), async (req, res) => {
    try{
        const settings = await getSettings();
        if(settings){
            let user = await userDetail(req.userData.user_id);
            if(user){
                user = user.Item
                if(req.body.redeemed_coins > user.coins){
                    return res.status(405).json(await response({}, 405, `You do not have ${req.body.redeemed_coins} AxPi to redeem`))
                }
                else if(req.body.redeemed_coins > user.coins - settings.minimum_coins){
                    return res.status(405).json(await response({}, 405, `You can not redeem all AxPi. You can redeem maximum ${user.coins - settings.minimum_coins} AxPi.`))
                }
                else if(req.body.redeemed_coins < settings.minimum_redeem_coins){
                    return res.status(405).json(await response({}, 405, `You can redeem ${settings.minimum_redeem_coins} or above AxPi.`))
                }
                else{
                    const redemption_data = await getRedemption();
                    if(redemption_data){
                        const random_coin_values = [0.05, 0.051, 0.052, 0.053, 0.054, 0.055, 0.056, 0.057, 0.058, 0.059, 0.060, 0.061, 0.062, 0.063, 0.064, 0.065, 0.066, 0.067, 0.068, 0.069, 0.070]
                        const coin_value = random_coin_values[Math.floor(Math.random() * random_coin_values.length)];
                        const reward  = parseFloat(parseFloat(coin_value) * parseInt(req.body.redeemed_coins)).toFixed(2)
                        const redemption_selected_option = req.body.redemption_option
                        const id = await insertRedemptionRequest(req.userData.user_id, req.body.redeemed_coins, redemption_selected_option, "DIGITAL", req.body.payment_mode_value, parseFloat(reward).toFixed(2)).catch(async error => {
                            await insertActivity(
                                req.userData.username,
                                req.userData.user_id,
                                "redemption",
                                "Error occured in insertRedemptionRequest function",
                                req.url,
                                error)
                            return res.status(500).json(await responseError());
                        })
                        if(id){
                            const item = {
                                module:"redemption",
                                battle_id: redemption_data.id,
                                battle_name: "Redemption",
                                battle_image: redemption_data.image_url,
                                user_id: req.userData.user_id,
                                entry_fee: req.body.redeemed_coins,
                                reward_type: redemption_selected_option,
                                reward: parseFloat(reward).toFixed(2),
                                coins: `-${req.body.redeemed_coins}`,
                                description: `${parseFloat(reward).toFixed(2)} ${redemption_selected_option} credited to TalenTitan Wallet`,
                                redemption_request_id: id,
                                timestamp: +new Date()
                            }
                            const data2 = await addUserCoinsHistory(item);
                            if(data2){
                                const data3 = await updateUserCoins(req.userData.user_id, `-${req.body.redeemed_coins}`);
                                if(data3){
                                    const data4 = await updateUserLeague(req.userData.user_id, data3.Attributes.coins);
                                    if(data4){
                                        const balance = await getWalletBalance(req.userData.user_id);
                                        const updatedBalance = await updateWalletBalance(req.userData.user_id, balance, parseFloat(reward));
                                        const transaction_id = "ttid"+ (parseInt(await getLastTransactionId()) + 1);
                                        const wallet_statements_data = await insertWalletStatements(req.userData.user_id, "CR" , updatedBalance,  parseFloat(reward),`Money transfered from TalenTitan Private Limited for the redemption of ${req.body.redeemed_coins}`, 'DIGITAL', null, transaction_id);
                                        const ad_data = await adData(req.userData.user_id, 11);
                                        return res.status(200).json(await response({id, updated_balance: parseFloat(updatedBalance), transaction_id: wallet_statements_data.transaction_id, reward: parseFloat(reward) }, 200, "Redemption request is successful", ad_data))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.log(err);
        await createErrorLog(err, "redemption.js", "", req.userData.user_id, req.url)
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "redemption",
            "Error occured in redemption api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/wallet/topup/operators', limiter, check_domain_middleware, jwtAuth, putActivity("Topups", "fetching all the operators"), async (req, res) => {
    try{
        const data = await getCronServerIndiaAirtimeOperators(req.query.country_code);
        return res.status(200).json(await response({operators: data}, 200, "Topups operators retreived successfully"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Topups",
            "Error occured in topup/operators api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/wallet/giftcards', limiter, check_domain_middleware, jwtAuth, putActivity("Giftcards", "fetching all the gift cards"), async (req, res) => {
    try{
        const data = await getGiftCards();
        return res.status(200).json(await response({giftcards: data}, 200, "Gift Cards retreived successfully"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Topups",
            "Error occured in get giftcards api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/wallet/statements', limiter, check_domain_middleware, jwtAuth, putActivity("Statements", "fetching statements"), async (req, res) => {
    try{
        const cache_key = `wallet_statements:${req.userData.user_id}:${req.query.page}`
        const data_to_send_from_cache = await redis.get(cache_key);
        if(data_to_send_from_cache){
            return res.status(200).json(await response(JSON.parse(data_to_send_from_cache), 200, "Statements retreived successfully")) 
        }
        const data = await getWalletStatements(req.userData.user_id, req.query.limit, req.query.page, req.query.order_by);
        await redis.set(cache_key, JSON.stringify({statements: data}), {EX: 86400})
        return res.status(200).json(await response({statements: data}, 200, "Statements retreived successfully"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Statements",
            "Error occured in get getWalletStatements function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.post('/order/giftcard', check_domain_middleware, jwtAuth, putActivity("Order Gift Card", "Ordering Giftcard"), async (req, res) => {
    try{
        if(await transactionAllowed(req.userData.user_id)){
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\d{10}$/; // Assuming a 10-digit phone number for simplicity
            // validate email
            if (!emailRegex.test(req.body.recipientEmail)) {
                res.status(400).json(await response({}, 400, 'Invalid email address' ));
            }
            // Validate phone number
            if (!phoneRegex.test(req.body.recipientPhoneDetails.phoneNumber)) {
                res.status(400).json(await response({}, 400, 'Invalid phone number' ));
            }
            if(req.body.productId == 1){
                res.status(405).json(await response({}, 405, "Amazon Gift Card can not be ordered"))
            } else if(constants.gift_card_products.includes(req.body.productId)){
                let unit_price = parseFloat(req.body.unitPrice).toFixed(2)
                if(req.body.senderFee)
                    unit_price = parseFloat(parseFloat(req.body.senderFee).toFixed(2) * parseFloat(unit_price).toFixed(2)).toFixed(2)
                const balance = await getWalletBalance(req.userData.user_id);
                if(balance < unit_price){
                    return res.status(405).json(await response({}, 405, "Insufficient balance to order"))
                } else if(req.body.quantity > 1){
                    return res.status(405).json(await response({}, 405, "Quantity cannot be greater than one"))
                } else {
                    const external_transfers_data = await insertExternalTransfers(req.userData.user_id, req.body.productId)
                    await orderGiftCard(req.body).catch(async err => {
                        console.log(err)
                        await insertActivity(
                            req.userData.username,
                            req.userData.user_id,
                            "Ordering giftcard",
                            "Error occured in orderGiftCard function",
                            req.url,
                            JSON.stringify(err))
                        await updateExternalTransfers(external_transfers_data.external_transfers_id, null, null, "FAILED");
                        let updatedBalance = await updateWalletBalance(req.userData.user_id, balance, -(parseFloat(unit_price)*parseInt(req.body.quantity)));
                        const wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance,  parseFloat(unit_price),`Ordered Giftcard`, "DIGITAL", null, external_transfers_data.transaction_id);
                        updatedBalance = await updateWalletBalance(req.userData.user_id, updatedBalance, parseFloat(unit_price)*parseInt(req.body.quantity));
                        await insertWalletStatements(req.userData.user_id, "CR" , updatedBalance,  parseFloat(unit_price),`Giftcard Order Failed`, "DIGITAL", null, external_transfers_data.transaction_id);
                        const order_data = {
                            product: {
                                currencyCode: "INR",
                                totalPrice: parseFloat(unit_price)*parseInt(req.body.quantity),
                                productId: req.body.productId,
                                productName: "Gift Card"
                            },
                            recipientEmail: req.body.recipientEmail,
                            recipientPhone: req.body.recipientPhoneDetails.phoneNumber,
                            customIdentifier: req.body.customIdentifier,
                            status: "FAILED"
                        }
                        const order_id = await insertGiftCardOrders(wallet_statements_data.wallet_statements_id, req.userData.user_id, order_data, wallet_statements_data.transaction_id, `Ordered Giftcard Failed`, "DIGITAL");
                        await updateExternalTransfers(external_transfers_data.external_transfers_id, null, order_id, "FAILED");
                        const ad_data = await adData(req.userData.user_id, 11);
                        return res.status(200).json(await response({order_details: {}, transaction_id: wallet_statements_data.transaction_id, updatedBalance, order_id, reference_id: null}, 200, "Ordered giftcard failed", ad_data))
                    }).then(async (data) =>{
                        await updateExternalTransfers(external_transfers_data.external_transfers_id, data.transactionId, null, data.status);
                        let updatedBalance = balance;
                        if(data.status == "SUCCESSFUL"){
                            updatedBalance = await updateWalletBalance(req.userData.user_id, balance, -(parseFloat(unit_price)*parseInt(req.body.quantity)));
                            let wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance,  parseFloat(unit_price),`Ordered Giftcard`, "DIGITAL", data.transactionId, external_transfers_data.transaction_id);
                            const order_id = await insertGiftCardOrders(wallet_statements_data.wallet_statements_id, req.userData.user_id, data, wallet_statements_data.transaction_id, `Ordered Giftcard`, "DIGITAL");
                            await updateExternalTransfers(external_transfers_data.external_transfers_id, data.transactionId, order_id, data.status);
                            const ad_data = await adData(req.userData.user_id, 11);
                            return res.status(200).json(await response({order_details: data, transaction_id: wallet_statements_data.transaction_id, updatedBalance, order_id, reference_id: data.transactionId}, 200, "Ordered giftcard successfully", ad_data))
                        } else if(data.status == "FAILED") {
                            let updatedBalance = await updateWalletBalance(req.userData.user_id, balance, -(parseFloat(unit_price)*parseInt(req.body.quantity)));
                            const wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance,  parseFloat(unit_price),`Ordered Giftcard`, "DIGITAL", data.transactionId, external_transfers_data.transaction_id);
                            updatedBalance = await updateWalletBalance(req.userData.user_id, updatedBalance, parseFloat(unit_price)*parseInt(req.body.quantity));
                            await insertWalletStatements(req.userData.user_id, "CR" , updatedBalance,  parseFloat(unit_price),`Ordered Giftcard Failed`, "DIGITAL", data.transactionId, external_transfers_data.transaction_id);
                            const order_id = await insertGiftCardOrders(wallet_statements_data.wallet_statements_id, req.userData.user_id, data, wallet_statements_data.transaction_id, `Ordered Giftcard Failed`, "DIGITAL");
                            await updateExternalTransfers(external_transfers_data.external_transfers_id, data.transactionId, order_id, data.status);
                            const ad_data = await adData(req.userData.user_id, 11);
                            return res.status(200).json(await response({order_details: data, transaction_id: wallet_statements_data.transaction_id, updatedBalance, order_id, reference_id: data.transactionId}, 200, "Ordered giftcard failed", ad_data))
                        }
                    });
                }
            } else {
                res.status(405).json(await response({}, 200, "Gift Card can not be ordered"))
            }
        } else {
            return res.status(405).json(await response({}, 405, "Please wait for 10 minutes to do new transaction"))
        }
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Ordering giftcard",
            "Error occured in post order/giftcard",
            req.url,
            JSON.stringify(err))
        res.status(500).json(await responseError());
    }
})

router.post('/order/topup', check_domain_middleware, jwtAuth, putActivity("Order TopUp", "Ordering TopUp"), async (req, res) => {
    try{
        if(await transactionAllowed(req.userData.user_id)){
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const phoneRegex = /^\d{10}$/; // Assuming a 10-digit phone number for simplicity
            // validate email
            if (!emailRegex.test(req.body.recipientEmail)) {
                return res.status(400).json(await response({}, 400, 'Invalid email address'))
            }
            // Validate phone number
            else if (!phoneRegex.test(req.body.senderPhone.number) || !phoneRegex.test(req.body.recipientPhone.number)) {
                return res.status(400).json(await response({}, 400, 'Invalid phone number of sender or recipient'))
            }
            const balance = await getWalletBalance(req.userData.user_id);
            if(balance < parseFloat(req.body.amount)){
                return res.status(405).json(await response({}, 405, "Insufficient balance to order"))
            } else {
                const external_transfers_data = await insertExternalTransfers(req.userData.user_id, req.body.operatorId)
                await orderTopuUp(req.body).catch(async err => {
                    console.log(err)
                    await insertActivity(
                        req.userData.username,
                        req.userData.user_id,
                        "Ordering giftcard",
                        "Error occured in orderTopuUp function",
                        req.url,
                        JSON.stringify(err))
                    await updateExternalTransfers(external_transfers_data.external_transfers_id, null, null, "FAILED");
                    let updatedBalance = await updateWalletBalance(req.userData.user_id, balance,  -(parseFloat(req.body.amount)));
                    const wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance, parseFloat(req.body.amount),`Ordered TopUp`, "DIGITAL", null, external_transfers_data.transaction_id);
                    updatedBalance = await updateWalletBalance(req.userData.user_id, updatedBalance, parseFloat(req.body.amount));
                    await insertWalletStatements(req.userData.user_id, "CR" , updatedBalance,  parseFloat(req.body.amount),`TopUp Order Failed`, "DIGITAL", null, external_transfers_data.transaction_id);
                    const order_data = {
                        balanceInfo: {
                            cost: parseFloat(req.body.amount)
                        },
                        operatorId: req.body.operatorId,
                        operatorName: "Top Up",
                        recipientEmail: req.body.recipientEmail,
                        recipientPhone: req.body.recipientPhone.number,
                        customIdentifier: req.body.customIdentifier,
                        status: "FAILED",
                        deliveredAmount: parseFloat(req.body.amount)
                    }
                    const order_id = await insertTopUpOrders(wallet_statements_data.wallet_statements_id, req.userData.user_id, order_data, wallet_statements_data.transaction_id, `Ordered TopUp Failed`, "DIGITAL");
                    await updateExternalTransfers(external_transfers_data.external_transfers_id, null, order_id, "FAILED");
                    const ad_data = await adData(req.userData.user_id, 11);
                    return res.status(200).json(await response({order_details: {}, transaction_id: wallet_statements_data.transaction_id, updatedBalance, order_id, reference_id: null}, 200, "Ordered Topup failed", ad_data))
                }).then(async (data) =>{
                    await updateExternalTransfers(external_transfers_data.external_transfers_id, data.transactionId, null, data.status);
                    let updatedBalance = balance;
                    if(data.status == "SUCCESSFUL"){
                        updatedBalance = await updateWalletBalance(req.userData.user_id, balance, -(parseFloat(req.body.amount)));
                        let wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance,  parseFloat(req.body.amount),`Ordered Topup`, "DIGITAL", data.transactionId, external_transfers_data.transaction_id);
                        const order_id = await insertTopUpOrders(wallet_statements_data.wallet_statements_id, req.userData.user_id, data, wallet_statements_data.transaction_id, `Ordered TopUp`, "DIGITAL");
                        await updateExternalTransfers(external_transfers_data.external_transfers_id, data.transactionId, order_id, data.status);
                        const ad_data = await adData(req.userData.user_id, 11);
                        return res.status(200).json(await response({order_details: data, transaction_id: wallet_statements_data.transaction_id, updatedBalance, order_id, reference_id: data.transactionId}, 200, "Ordered Topup successfully", ad_data))
                    } else if(data.status == "FAILED") {
                        let updatedBalance = await updateWalletBalance(req.userData.user_id, balance, -(parseFloat(req.body.amount)));
                        const wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance,  parseFloat(req.body.amount),`Ordered Topup`, "DIGITAL", data.transactionId, external_transfers_data.transaction_id);
                        updatedBalance = await updateWalletBalance(req.userData.user_id, updatedBalance, parseFloat(req.body.amount));
                        await insertWalletStatements(req.userData.user_id, "CR" , updatedBalance,  parseFloat(req.body.amount),`Ordered Topup Failed`, "DIGITAL", data.transactionId, external_transfers_data.transaction_id);
                        const order_id = await insertTopUpOrders(wallet_statements_data.wallet_statements_id, req.userData.user_id, data, wallet_statements_data.transaction_id, `Ordered TopUp Failed`, "DIGITAL");
                        await updateExternalTransfers(external_transfers_data.external_transfers_id, data.transactionId, order_id, data.status);
                        const ad_data = await adData(req.userData.user_id, 11);
                        return res.status(200).json(await response({order_details: data, transaction_id: wallet_statements_data.transaction_id, updatedBalance, order_id, reference_id: data.transactionId}, 200, "Ordered Topup failed", ad_data))
                    }
                });
            }
        } else {
            return res.status(405).json(await response({}, 405, "Please wait for 10 minutes to do new transaction"))
        }
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Ordering Topup",
            "Error occured in post order/topup",
            req.url,
            JSON.stringify(err))
        return res.status(500).json(await responseError());
    }
})

router.get('/wallet/orders', limiter, check_domain_middleware, jwtAuth, putActivity("Orders", "fetching orders"), async (req, res) => {
    try{
        const cache_key = `wallet_orders:${req.userData.user_id}:${req.query.page}`
        const data_to_send_from_cache = await redis.get(cache_key);
        if(data_to_send_from_cache){
            return res.status(200).json(await response(JSON.parse(data_to_send_from_cache), 200, "Orders retreived successfully")) 
        }
        const data = await getWalletOrders(req.userData.user_id, req.query.limit, req.query.page, req.query.order_by);
        await redis.set(cache_key, JSON.stringify({orders: await responseOrderData(data)}), {EX: 86400})
        return res.status(200).json(await response({orders: await responseOrderData(data)}, 200, "Orders retreived successfully"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Orders",
            "Error occured in get getWalletOrders function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/transaction/verify', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        const data = await transactionAllowed(req.userData.user_id);
        return res.status(200).json(await response({transaction_allowed: data}, 200, "Data retrieved"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Orders",
            "Error occured in get getWalletOrders function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/operators', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        const operators = await getCronServerOperators();
        return res.status(200).json(await response({operators}, 200, "Data retrieved"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "operators",
            "Error occured in get getAllOperators function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/operators/locations', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        const states = await getCronServerOperatorLocations(req.query.operator_id);
        return res.status(200).json(await response({states}, 200, "Data retrieved"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "locations",
            "Error occured in get getAllLocationsForOperator function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/operators/plans', limiter, check_domain_middleware, jwtAuth, async (req, res) => {
    try{
        const plans = await getCronServerOperatorByOperatorId(req.query.operator_id, req.query.state_code);
        return res.status(200).json(await response({plans}, 200, "Data retrieved"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "plans",
            "Error occured in get getAllPlansFromOperatorId function",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/cron_server/wallet/topup/operators', limiter, check_domain_middleware, api_key_auth, async (req, res) => {
    try{
        const data = await getIndiaAirtimeOperators(req.query.country_code);
        return res.status(200).json(await response({operators: data}, 200, "Topups operators retreived successfully"))
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Topups",
            "Error occured in topup/operators api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/cron_server/operators', limiter, check_domain_middleware, api_key_auth, async (req, res) => {
    try{
        const operators = await getAllOperators();
        return res.status(200).json(operators)
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Topups",
            "Error occured in topup/operators api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/cron_server/operator_locations', limiter, check_domain_middleware, api_key_auth, async (req, res) => {
    try{
        const states = await getAllLocationsForOperator(req.query.operator_id);
        console.log(states);
        console.log(req.query.operator_id)
        return res.status(200).json(states)
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Topups",
            "Error occured in topup/operators api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})

router.get('/cron_server/operator_by_operator_id', limiter, check_domain_middleware, api_key_auth, async (req, res) => {
    try{
        const plans = await getAllPlansFromOperatorId(req.query.operator_id, req.query.state_code);
        return res.status(200).json(plans)
    } catch (err) {
        console.log(err);
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "Topups",
            "Error occured in topup/operators api",
            req.url,
            err)
        return res.status(500).json(await responseError());
    }
})



module.exports = router;
