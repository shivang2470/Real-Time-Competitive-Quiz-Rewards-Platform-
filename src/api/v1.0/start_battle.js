const express = require('express');
const request = require("request")
const random_name = require('random-indian-name');
const axios = require('axios');
const router = express.Router();
const jwtAuth = require('../../Auth/auth')
const api_key_auth = require('../../Auth/start_battle_auth')
const key = require('../../../config/keys')
const { responseError, response } = require("../../models/response")
const getPreSignedURL = require("../../s3/pre_signed_url_generator")
const { register_bot, face_detect, nsfw_detect, start_battle_coin_check, live_battle_count } = require("../../models/start_battle")
const { insertActivity } = require("../../models/activities")
const { battle_result } = require("../../start_battle/battle_result")
const { save_battle, deduct_fee } = require("../../start_battle/save_battle")
const { putActivity } = require("../../Auth/activity_middleware")
const check_domain_middleware = require('../../Auth/check_domain_middleware');
const blockedBattleModel = require('../../db/modules/blocked_user_battle');
const { adData } = require('../../models/external_ads');
const { redis } = require('../../models/redis');

const max_live_battle_count = 3
let last_battle_player1_id = ''
let last_battle_player2_id = ''
let last_battle_file_player1 = ''
let last_battle_file_player2 = ''

router.get('/battle_file', check_domain_middleware, jwtAuth, putActivity("battle", "User uploading file for battle"), async (req, res) => {
    const url = await getPreSignedURL(
        key.user_bucket_name,
        `battle_files/${req.userData.username}/${req.query.file_name}`
    ).catch(async (error)=>{
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "battle",
            "Error while upload an image in getPreSignedURL",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(url){
        res.status(200).json(await response(url, 200, "Battle file url retrieved successfully"))
    }
})

router.get('/bot', check_domain_middleware, api_key_auth, async (req, res) => {
    const requestOptions = {
        url: 'https://randomuser.me/api?nat=IN',
        method: 'GET'
    };
    request(requestOptions, async (err, apiResponse, body) => {
        if (err) {
            await insertActivity(
                "Unknown",
                "Unknown",
                "battle",
                "Error occured when calling bot api (https://randomuser.me/api/)",
                req.url,
                err)
            res.status(500).json(await responseError());
        } else if (apiResponse.statusCode === 200) {
            const result = JSON.parse(body).results[0]
            result['login']['username'] = random_name({ first: true }).toLowerCase()
            axios.get('https://100k-faces.glitch.me/random-image-url')
            .then(async function (face_response) {
                result['picture']['large'] = face_response.data.url
                const botResponse = await register_bot(result, req.query.battle_id).catch(async error => {
                    await insertActivity(
                        "Unknown",
                        "Unknown",
                        "battle",
                        "Error occured in register_bot function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                if(botResponse){
                    res.status(200).json(await response(botResponse, 200, "Bot data retrieved successfully"))
                }
            })
        } else {
            await insertActivity(
                "Unknown",
                "Unknown",
                "battle",
                "Error occured when calling bot api (https://randomuser.me/api/)",
                req.url,
                apiResponse.statusCode)
            res.status(200).json(await responseError());
        }
    });
})

router.post('/detect_face', check_domain_middleware, jwtAuth, async (req, res) => {
    const count = await live_battle_count(req.userData.user_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "detect face api",
            "Error occured in live_battle_count function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(count >= max_live_battle_count){
        res.status(400).json(await response({}, 400, "You can play 3 live battles only. Please wait for your old battle to complete."))
    }
    else{
        if(key.face_detection == "true" || key.face_detection == true){
            const data = await face_detect(req.body.image_url).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "detect face",
                    "Error occured in face_detect function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(data){
                if(data.num_faces == 1){
                    res.status(200).json(await response({}, 200, "One face detected"))
                }
                else if(data.num_faces == 0){
                    res.status(400).json(await response({}, 400, "Face not detected"))
                }
                else{
                    res.status(400).json(await response({}, 400, "Face not detected properly"))
                }
            }
        } else {
            res.status(200).json(await response({}, 200, "One face detected"))
        }
    }
})

router.post('/detect_nsfw', check_domain_middleware, jwtAuth, async (req, res) => {
    const count = await live_battle_count(req.userData.user_id).catch(async error => {
        await insertActivity(
            req.userData.username,
            req.userData.user_id,
            "detect face api",
            "Error occured in live_battle_count function",
            req.url,
            error)
        res.status(500).json(await responseError());
    })
    if(count >= max_live_battle_count){
        res.status(400).json(await response({}, 400, "You can play 3 live battles only. Please wait for your old battle to complete."))
    }
    else{
        if(key.nudity_detection == "true" || key.face_detection == true){
            const data = await nsfw_detect(req.body.image_url).catch(async error => {
                await insertActivity(
                    req.userData.username,
                    req.userData.user_id,
                    "detect nsfw",
                    "Error occured in nsfw_detect function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            })
            if(data){
                if(data['result']["nudity"] == true){
                    res.status(400).json(await response({}, 400, "TalenTitan do not allow some images"))
                }
                else{
                    res.status(200).json(await response({}, 200, "Image is verified"))
                }
            }
        } else {
            res.status(200).json(await response({}, 200, "Image is verified"))
        }
    }
})

router.post('/create_battle', api_key_auth, async (req, res) => {
    let player1 = req.body.player1
    let player2 = req.body.player2
    const player1_data = await redis.get(`create_battle_${player1.user_id}`)
    const player2_data = await redis.get(`create_battle_${player2.user_id}`)
    if(player1_data || player2_data){
        return res.status(405).json(await response("Battle Already created. Please wait for 1 minute before creating another battle", 405, "Error"))
    }
    if(player1.user_id == "" || player2.user_id == "" || player1.battle_id == "" || player2.battle_id == ""){
        res.status(200).json(await response("Player1 or Player2 user_id or battle_id not provided", 200, "Error"))
    }
    else if(await start_battle_coin_check(player1.battle_id, player1.user_id) && await start_battle_coin_check(player2.battle_id, player2.user_id) && await live_battle_count(player1.user_id) < max_live_battle_count && await live_battle_count(player2.user_id) < max_live_battle_count){
        const randomNum = Math.floor((Math.random() * 100) + 1);
        let matched_items = [player1, player2]
        if(randomNum % 2 === 0){
            matched_items = [player2, player1]
        }
        const result = await save_battle(matched_items).catch(async error => {
            await insertActivity(
                "Unknown",
                player1.user_id + " vs " + player2.user_id,
                "battle",
                "Error occured in save_battle function",
                req.url,
                error)
            res.status(500).json(await responseError());
        })
        if(result){
            await deduct_fee(
                result.data._id,
                result.data.entry_fee,
                result.data.player1.id,
                result.data.player2.id,
                result.data.entry_fee_deducted
            ).catch(async error => {
                await insertActivity(
                    "Unknown",
                    player1.user_id + " vs " + player2.user_id,
                    "battle",
                    "Error occured in deduct_fee function",
                    req.url,
                    error)
                res.status(500).json(await responseError());
            }).then(async (responseData) => {
                await insertActivity(
                    "Unknown",
                    player1.user_id + " vs " + player2.user_id,
                    "battle",
                    "Battle created successfully",
                    req.url)
                await redis.set(`create_battle_${player1.user_id}`, JSON.stringify(player1), {EX: 30})
                await redis.set(`create_battle_${player2.user_id}`, JSON.stringify(player2), {EX: 30})
                res.status(200).json(await response(result.data, 200, "Battle Created"))
            })
        }
    }
    else{
        res.status(405).json(await response("Unable to create battle due to current battle restrictions. Please review the restrictions and try again.", 405, "Error"))
    }
})

router.post('/declare_result', api_key_auth, async (req, res) => {
    const result = {data: req.body}
    const is_blocked_data = blockedBattleModel.find({_id: result.data._id})
    is_blocked_data.exec(async function (err, data) {
        if (err) {
            reject(err)
        }
        else {
            if (data.length > 0) {
                res.status(200).json(await response(`Updated for battle id ${result.data._id} (Blocked)`, 200, "Battle Blocked"))
            }
            else {
                const battle_result_data = await battle_result(result).catch(async error => {
                    await insertActivity(
                        "Unknown",
                        result.data.player1.id + " vs " + result.data.player2.id,
                        "battle",
                        "Error occured in battle_result function",
                        req.url,
                        error)
                    res.status(500).json(await responseError());
                })
                if(battle_result_data){
                    res.status(200).json(await response(`Updated for battle id ${result.data._id}`, 200, "Result declared"))
                }
            }
        }
    })
})

module.exports = router;
