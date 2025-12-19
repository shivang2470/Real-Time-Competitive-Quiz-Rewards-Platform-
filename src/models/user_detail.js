const AWS = require('aws-sdk');
const key = require('../../config/keys');
const bcrypt = require("bcryptjs");
const { insertActivity } = require("../models/activities");

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const table = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const phoneNumberExists = async (phone_number) => {
    let params = {
        TableName: table,
        IndexName: 'type-phone_number-index',
        KeyConditionExpression: '#type = :hkey and phone_number = :phone_number',
        ExpressionAttributeNames: { '#type': 'type' },
        ExpressionAttributeValues: { ':hkey': 'user', ':phone_number': parseInt(phone_number) },
    };
    return new Promise((async (resolve, reject) => {
        try{
            docClient.query(params, async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    if (data.Items.length != 0) {
                        resolve(409);
                    }
                    else {
                        resolve(200);
                    }
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const userDetail = async (user_id) => {
    const params = {
        TableName: table,
        Key: { "type": 'user',"id": user_id },
        ExpressionAttributeNames: { "#name": "name", "#status": "status"},
        ProjectionExpression: 'avatar, #name, username, league, coins, #status, referral_code, phone_number, user_type, axpi_romp',
    };
    return new Promise(((resolve, reject) => {
        try{
            docClient.get(params, async function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const check_current_password = async (user_id, password) => {
    const params = {
        TableName: table,
        Key: { "type": 'user',"id": user_id },
        ProjectionExpression: 'password',
    };
    return new Promise(((resolve, reject) => {
        try{
            docClient.get(params, async function (err, data) {
                if (err) {
                    reject(err);
                } else {
                    bcrypt.compare(password, data.Item.password).then(async isMatch => {
                        if (isMatch) {
                            resolve(200);
                        }
                        else{
                            resolve(403);
                        }
                    })
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const updateUserDetail = async (user_id, update_key, update_value) => {
    const params = {
        TableName: table,
        Key: {
            "type": "user",
            "id": user_id
        },
        UpdateExpression: `set ${update_key} = :value`,
        ExpressionAttributeValues: { ":value": update_value },
        ReturnValues: "UPDATED_NEW"
    };
    if(update_key == "name"){
        params['UpdateExpression'] = "set #name = :value"
        params['ExpressionAttributeNames'] =  {"#name": "name"}
    }
    if(update_key == "status"){
        params['UpdateExpression'] = "set #status = :value"
        params['ExpressionAttributeNames'] =  {"#status": "status"}
    }
    if(update_key == "phone_number"){
        params['ExpressionAttributeValues'][":value"] = parseInt(update_value)
    }
    return new Promise((async (resolve, reject) => {
        try{
            if(update_key == "name" || update_key == "avatar" || update_key == "clan" || 
            update_key == "phone_number" || update_key == "clan_id" || update_key == "status"
            ){
                if(update_key == "phone_number"){
                    const status_code = await phoneNumberExists(update_value).catch(async error => {
                        reject(error);
                    })
                    if(status_code){
                        if(status_code == 200){
                            docClient.update(params, async (err, data) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve({status_code, data});
                                }
                            });
                        }
                        else{
                            resolve({status_code});
                        }
                    }
                }
                else{
                    docClient.update(params, async (err, data) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({status_code: 200, data});
                        }
                    });
                }
            }
            else{
                resolve({status_code: 401, data: "Can not update"})
            }
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const change_password = async (user_id, password) => {
    const params = {
        TableName: table,
        Key: {
            "type": "user",
            "id": user_id
        }
    };
    return new Promise((async (resolve, reject) => {
        try{
            bcrypt.genSalt(10, async (err, salt) => {
                bcrypt.hash(password, salt, async (err, hash) => {
                    if (err) {
                        reject(err);
                    } else {
                        params['UpdateExpression'] = "set #password = :password"
                        params['ExpressionAttributeNames'] =  {"#password": "password"}
                        params['ExpressionAttributeValues'] =  {":password": hash}
                        docClient.update(params, (err, data) => {
                            if (err){
                                reject(err);
                            }
                            else{
                                resolve(data);
                            }
                        });
                    }
                })
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

module.exports = { userDetail, updateUserDetail, change_password, check_current_password }