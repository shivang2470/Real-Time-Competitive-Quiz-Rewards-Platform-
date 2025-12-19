const express = require('express');
const router = express.Router();
const path = require("path");
const { google } = require("googleapis");
const { insertActivity } = require("../../models/activities")
const api_key_auth = require('../../Auth/start_battle_auth');
const { updateGoogleSheet } = require('../../models');
const { response } = require("../../models/response")

const auth = new google.auth.GoogleAuth({
    keyFile: path.resolve("config/credentials.json"),
    scopes: "https://www.googleapis.com/auth/spreadsheets",
});

const spreadsheetId = process.env.spreadsheetId;
let googleSheets = {}
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const googleSheetInitialization = async () => {
    // Create client instance for auth
    const client = await auth.getClient().catch(async (err)=>{
        await insertActivity(
            "Unknown",
            "Unknown",
            "redemption",
            "",
            'googleSheetInitialization function error',
            err
        )
    })
    // Instance of Google Sheets API
    googleSheets = google.sheets({ version: "v4", auth: client });
}

googleSheetInitialization()

// Add data to google sheet

router.post('/add_google_sheet_data', api_key_auth, async (req, res) => {
    const currentTime = new Date();
    const currentOffset = currentTime.getTimezoneOffset();
    const ISTOffset = 330;   // IST offset UTC +5:30 
    const current_date = new Date(currentTime.getTime() + (ISTOffset + currentOffset)*60000);
    const data_inserted = await updateGoogleSheet(
        googleSheets,
        spreadsheetId,
        auth,
        "TalenTitan",
        current_date.getDate() + " " + months[parseInt(current_date.getMonth())] + " " + current_date.getFullYear(),
        "Redemption",
        `Paid to ${req.body.username} : ${req.body.phone_number}`,
        "",
        req.body.amount_to_redeem,
        `For redeemtion of ${req.body.amount_to_redeem} ${req.body.redemption_option}`
        ).catch(async err => {
            console.log(err);
            res.status(200).json({message: err, status_code: 500});
        })
    if(data_inserted){
        res.status(200).json(await response({}, 200, "Data Inserted"));
    }
})

module.exports = router;