const AWS = require('aws-sdk');
const keys = require('../../config/keys');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

AWS.config.update({
    region: keys.region,
    accessKeyId: keys.AWS_ACCESS_KEY,
    secretAccessKey: keys.AWS_SECRET_ACCESS_KEY
});

const table = keys.tableApkTokens;
const docClient = new AWS.DynamoDB.DocumentClient();
const type = "token"

const addToken = async (item) => {
    const id = uuidv4() 
    const params = {
        TableName: table,
        Item: {
            "type": type,
            "id": id,
            "user_id": item.user_id,
            "token": item.token,
            "expire_timestamp": item.expire_timestamp,
            "ip": item.ip,
            "app_id": item.app_id
        }
    };
    return new Promise(((resolve, reject) => {
        try{
            if(item.ip){
                params.Item["ip"] = item.ip
            }
            if(item.app_id){
                params.Item["app_id"] = item.app_id
            }
            jwt.sign({ username: item.username, user_id: item.user_id }, keys.refreshTokenJwtSecret, async function (jwtErr, refresh_token) {
                if(jwtErr){
                    reject(jwtErr)
                }
                else{
                    params["Item"]["refresh_token"] = refresh_token
                    docClient.put(params, async function (err, data) {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(data)
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

const updateToken = async (item) => {
    return new Promise((async (resolve, reject) => {
        try{
            jwt.sign({ username: item.username, user_id: item.user_id }, keys.refreshTokenJwtSecret, async function (jwtErr, refresh_token) {
                if(jwtErr){
                    reject(jwtErr)
                }
                else{
                    const params = {
                        TableName: table,
                        Key: {
                            "type": type,
                            "id": item.id
                        },
                        UpdateExpression: "set #token = :token, expire_timestamp = :expire_timestamp, refresh_token = :refresh_token, #ip = :ip",
                        ExpressionAttributeValues: {
                            ":token": item.token,
                            ":expire_timestamp": item.expire_timestamp,
                            ":refresh_token": refresh_token,
                            ":ip": item.ip
                        },
                        ExpressionAttributeNames: { '#token': 'token', '#ip': 'ip' },
                    }
                    if(item.app_id){
                        params.UpdateExpression = "set #token = :token, expire_timestamp = :expire_timestamp, refresh_token = :refresh_token, #ip = :ip, #app_id = :app_id"
                        params.ExpressionAttributeValues[":app_id"] = item.app_id
                        params.ExpressionAttributeNames["#app_id"] = "app_id"
                    }
                    docClient.update(params, async (updateErr, updatedData) => {
                        if (updateErr) {
                            reject(updateErr)
                        } else {
                            resolve(updatedData)
                        }
                    });
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const getTokenIdByUserAppId = async (user_id, app_id) => {
    const params = {
        TableName: table,
        IndexName: 'user_id-app_id-index',
        KeyConditionExpression: '#user_id = :user_id and #app_id = :app_id',
        ExpressionAttributeNames: { '#user_id': "user_id", '#app_id': "app_id" },
        ExpressionAttributeValues: { ':user_id': user_id, ':app_id': app_id,  },
    }
    return new Promise((async (resolve, reject) => {
        try{
            docClient.query(params, async function (findingUserTokenErr, userTokenData) {
                if (findingUserTokenErr) {
                    reject(findingUserTokenErr)
                }
                else{
                    resolve(userTokenData.Items[0])
                }
            })
        }
        catch(exec){
            reject(exes)
        }
    }))
}

const deleteToken = async (id, ip) => {
    return new Promise((async (resolve, reject) => {
        try{
            const params = {
                TableName: table,
                Key: {
                    "type": type,
                    "id": id
                },
                UpdateExpression: "set #token = :token, refresh_token = :refresh_token, #ip = :ip",
                ExpressionAttributeValues: {
                    ":token": '',
                    ":refresh_token": '',
                    ":ip": ip
                },
                ExpressionAttributeNames: { '#token': 'token', '#ip': 'ip' }
            }
            docClient.update(params, async (updateErr, updatedData) => {
                if (updateErr) {
                    reject(updateErr)
                } else {
                    resolve(updatedData)
                }
            });
        }
        catch(exec){
            reject(exec)
        }
    }))
}

module.exports = {addToken, updateToken, getTokenIdByUserAppId, deleteToken}