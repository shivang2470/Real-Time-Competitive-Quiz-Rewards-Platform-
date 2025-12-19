const express = require('express');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const { insertActivity } = require("../../models/activities")
const { responseError, response } = require("../../models/response")
const { putActivity } = require("../../Auth/activity_middleware");
const { insertRedemptionRequest, getWalletBalance, updateWalletBalance, insertWalletStatements, getWalletId, transactionAllowed, getLastTransactionId } = require('../../models/redemption');
const { userDetail } = require('../../models/user_detail');
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const { adData } = require('../../models/external_ads');
const rateLimit = require("express-rate-limit");

const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minutes
    max: 30,
    message:{
        message: "Too many requests, please try again after sometime"   
    }
  });

router.post('/request', limiter, check_domain_middleware, jwtAuth, putActivity("redemption", "Bank Account/Amazon Gift Card Redemption Request"), async (req, res) => {
    if(process.env.redemption_accepted === "false" || process.env.redemption_accepted === false){
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "redemption",
            "New Redemption request is coming but can not accepted",
            req.url,
            `Due to Financial guidelines. Currently, we are not accepting withdraw requests.`)
        res.status(405).json(await response({}, 405, `Due to Financial guidelines. Currently, we are not accepting withdraw requests. Please select any other redemption option.`))
    }
    else{
        if(await transactionAllowed(req.userData.user_id)){
            const balance = await getWalletBalance(req.userData.user_id);
            if(parseFloat(req.body.redeemed_amount) < 10){
                res.status(405).json(await response({}, 405, `Amount should be ₹10 or more`))
            } else if(req.body.redeemed_amount > balance){
                res.status(405).json(await response({}, 405, `You do not have ₹ ${req.body.redeemed_amount} to withdraw from wallet`))
            } else {
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
                    const redeemed_amount  = req.body.redeemed_amount
                    const redemption_selected_option = req.body.redemption_option
                    const id = await insertRedemptionRequest(req.userData.user_id, redeemed_amount, redemption_selected_option, req.body.payment_mode, req.body.payment_mode_value, redeemed_amount).catch(async error => {
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
                        let payment_purpose = "Money transfered from TalenTitan Wallet to withdraw bank account"
                        let response_message = "Withdraw request is successful. You will receive amount within 15 working days."
                        if(req.body.payment_mode == "AMAZON GIFT CARD"){
                            payment_purpose = "Money transfered from TalenTitan Wallet to Amazon Gift Card"
                            response_message = "Withdraw request is successful. You will receive Amazon Gift Card on your given Email Id within 5 working days."
                        }
                        const updatedBalance = await updateWalletBalance(req.userData.user_id, balance, -parseFloat(redeemed_amount));
                        const transaction_id = "ttid"+ (parseInt(await getLastTransactionId()) + 1);
                        const wallet_statements_data = await insertWalletStatements(req.userData.user_id, "DR" , updatedBalance,  parseFloat(redeemed_amount), payment_purpose, req.body.payment_mode, null, transaction_id);
                        const ad_data = await adData(req.userData.user_id, 11);
                        res.status(200).json(await response({transaction_id: wallet_statements_data.transaction_id, updatedBalance}, 200, response_message, ad_data))
                    }
                }   
            }
        } else {
            return res.status(405).json(await response({}, 405, "Please wait for 10 minutes to do new transaction"))
        }
    }
})

module.exports = router;
