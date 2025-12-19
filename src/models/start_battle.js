
const AWS = require('aws-sdk');
const bcrypt = require("bcryptjs");
const axios = require("axios");
const key = require('../../config/keys');
const battleModel = require('../db/modules/user_battles')
const { response } = require("../models/response");
const { getBattleFromBattleId, getUserByUserId } = require('.');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const tableUser = key.tableUser;
const tableBots = key.tableBots;

const docClient = new AWS.DynamoDB.DocumentClient();

const save_battle_data = async (item) => {
    var new_battle = new battleModel(item)
    return new Promise(((resolve, reject) => {
        try{
            new_battle.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(await response(result, 200, "Data retrieved successfully"));
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const face_detect = async (image_url) => {
    const auth = 'Basic ' + Buffer.from(key.ml_scripts_username + ':' + key.ml_scripts_password).toString('base64');
    const options = {
        method: 'GET',
        url: key.ml_scripts_url+"/detect_faces"+"?image_url="+image_url,
        headers: {
          'content-type': 'application/json',
          'Authorization': auth
        },
    };
    return new Promise(((resolve, reject) => {
        try{
            axios.request(options).then(function (response) {
                resolve(response.data);
            }).catch(function (error) {
                reject(error);
            });
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const nsfw_detect = async (image_url) => {
    const auth = 'Basic ' + Buffer.from(key.ml_scripts_username + ':' + key.ml_scripts_password).toString('base64');
    const options = {
        method: 'GET',
        url: key.ml_scripts_url+"/detect_nudity"+"?image_url="+image_url,
        headers: {
            'content-type': 'application/json',
            'Authorization': auth
        }
    };
    return new Promise(((resolve, reject) => {
        try{
            axios.request(options).then(function (response) {
                resolve(response.data);
            }).catch(function (error) {
                console.log(error)
                reject(error);
            });
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const get_bot = async (battle_id) => {
    const params = {
        TableName: tableBots,
        IndexName: 'type-battle_id-index',
        KeyConditionExpression: '#type = :hkey and #battle_id = :hkey2',
        ExpressionAttributeNames: { '#type': 'type', '#battle_id': 'battle_id' },
        ExpressionAttributeValues: { ':hkey': 'bot', ':hkey2': battle_id },
        ProjectionExpression: 'file_url',
    }
    return new Promise(((resolve, reject) => {
        try{
            docClient.query(params, async function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    const arr_data = data.Items
                    const randomItem = arr_data[Math.floor(Math.random() * arr_data.length)];
                    resolve(randomItem.file_url)
                }
            });
        }
        catch(exec){
            reject(exec)
        }
    }));
}

const register_bot = async (item, battle_id) => {
    var battle_file = ''
    var userId = item.login.uuid
    var name = item.name.first + ' ' + item.name.last
    var phone_number = 9876543210
    var username = item.login.username
    var d = new Date();
    var date = d.getDate()
    var h = d.getHours()
    var m = d.getMinutes()
    var s = d.getSeconds()
    var smill = d.getMilliseconds()
    var referral_code = m + "" + h + "" + date + "" + s + "" + parseInt(smill)
    var avatar = item.picture.large
    let params = { 
        TableName: tableUser,
        Item: {
            "id": userId,
            "type": "user",
            "name": name,
            "username": username,
            "phone_number": parseInt(phone_number),
            "timestamp": +new Date(),
            "total_participation": 0,
            "referral_code": referral_code,
            "avatar": avatar,
            "confirmed": false,
            "coins": 100,
            "blocked_names_userid": [],
            "league": "Bronze I",
            "clan": "",
            "clan_id": "",
            "user_type": 'bot',
            "status": "Available",
            "axpi_romp": 1000
        },
    };
    return new Promise(((resolve, reject) => {
        try{
            bcrypt.genSalt(10, async (err, salt) => {
                bcrypt.hash(item.login.password, salt, async (err, hash3) => {
                    if (err) {
                        reject(err);
                    } else {
                        params.Item.password = hash3
                        docClient.put(params, async function (err, data2) {
                            if (err) {
                                reject(err);
                            } else {
                                battle_file = avatar
                                if(battle_id != key.dp_battle_id){
                                    battle_file = await get_bot(battle_id)
                                }
                                resolve({"user_id": userId, "battle_file": battle_file})
                            }
                        })
                    }
                })
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const start_battle_coin_check = async (battle_id, user_id) => {
    const battle_detail = await getBattleFromBattleId(battle_id)
    const user_detail = await getUserByUserId(user_id)
    if(user_detail[0]["coins"] >= battle_detail.data[0].entryFee){
        return true
    }
    else{
        return false
    }
}

const live_battle_count = async (user_id) => {
    const battleCount = battleModel.find({ $and: [{$or: [{'player1.id': user_id}, {'player2.id': user_id}]}, { end_timestamp: { $gte: new Date().getTime() }}]}).count();
    return new Promise((async (resolve, reject) => {
        battleCount.exec(async function (err, count) {
            if (err) {
                reject(err);
            }
            else {
                resolve(count)
            }
        })
    }))
}

module.exports = { save_battle_data, register_bot, face_detect, nsfw_detect, start_battle_coin_check, live_battle_count, get_bot }