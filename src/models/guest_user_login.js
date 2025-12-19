const AWS = require('aws-sdk');
const key = require('../../config/keys');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});


const tableGuestUser = key.table_guest_user;

const docClient = new AWS.DynamoDB.DocumentClient();

const check_app_id = async (app_id) => {
    const appIdCheckingParams = {
        TableName: tableGuestUser,
        KeyConditionExpression: '#type = :hkey',
        ExpressionAttributeNames: { '#type': 'app_id' },
        ExpressionAttributeValues: { ':hkey': app_id},
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(appIdCheckingParams, async function (err, data) {
            if (err) {
                console.log(err)
                reject(err)
            }
            else {
                if (data.Items.length === 0) {
                    resolve([])
                }
                else {
                    resolve(data.Items)
                }
            }
        })
    }))
}

const add_guest_user_data = async (app_id) => {
    const guest_id = uuidv4()
    const current_time = +new Date()
    return new Promise((async (resolve, reject) => {
    jwt.sign({
        "guest_id": guest_id,
        "timestamp": current_time,
    }, key.guest_user_login_secret_key, { expiresIn: `1d` }, async function (err, token) {
        if (err) {
            console.log(err);
        }
        else {
            const params = {
                TableName: tableGuestUser,
                Item: {
                    "app_id": app_id,
                    "guest_id": guest_id,
                    "token": token,
                    "updated_timestamp": current_time,
                },
            };
            
                docClient.put(params, async function (insert_error, insert_data) {
                    if (err) {
                        reject(insert_error)
                    } 
                    else {
                        resolve(token);
                    }
                })
            }
        })
    }))
}

const update_guest_user_token = async (app_id, guest_id) => {
    const current_time = +new Date()
    return new Promise((async (resolve, reject) => {
        jwt.sign({
            "guest_id": guest_id,
            "timestamp": current_time,
        }, key.guest_user_login_secret_key, { expiresIn: `1d` }, async function (err, token) {
            if (err) {
                reject(err);
            }
            else {
                const params = {
                    TableName: tableGuestUser,
                    Key: {
                        "app_id": app_id,
                        "guest_id": guest_id
                    },
                    UpdateExpression: "set #token = :token",
                    ExpressionAttributeValues: {
                        ":token": token
                    },
                    ExpressionAttributeNames: { '#token': 'token' },
                }
                docClient.update(params, async (updateErr, updatedData) => {
                    if (updateErr) {
                        reject(updateErr)
                    } else {
                        resolve(token)
                    }
                });
            }
        })
    }))
}

const get_app_id_from_token = async (guest_id, token) => {
    const appIdCheckingParams = {
        TableName: tableGuestUser,
        IndexName: "guest_id-token-index",
        KeyConditionExpression: '#type = :hkey and #type2 = :hkey2',
        ExpressionAttributeNames: { '#type': 'guest_id', '#type2': 'token' },
        ExpressionAttributeValues: { ':hkey': guest_id, ':hkey2': token},
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(appIdCheckingParams, async function (err, data) {
            if (err) {
                console.log(err)
                reject(err)
            }
            else {
                if (data.Items.length === 0) {
                    resolve('')
                }
                else {
                    resolve(data.Items[0].app_id)
                }
            }
        })
    }))
}

module.exports =  { check_app_id,add_guest_user_data, update_guest_user_token, get_app_id_from_token }