const AWS = require('aws-sdk');
const key = require('../../config/keys');
const axios = require('axios');
const uuid = require("uuid");
AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});
const { apk_error_notifications } = require("./slack_templets")
const table = key.activity_table
const game_table = key.game_activity_table
const docClient = new AWS.DynamoDB.DocumentClient();

const insertActivity = async (username, user_id, page, action_text, api, err) => {
    return new Promise((async (resolve, reject) => {
        if (process.env.ENVIRONMENT == "test" || process.env.ENVIRONMENT == "production") {
            const timestamp = +new Date()
            const activity_id = uuid.v4();
            const params = {
                TableName: table,
                Item: {
                    "type": "activity",
                    "id": activity_id,
                    "user_id": user_id,
                    "username": username,
                    "page": page,
                    "action": action_text,
                    "api_endpoint": api,
                    "timestamp": timestamp
                }
            };
            if (err && key.error_activity == "show") {
                params.Item.err = err;
                axios.post(key.apk_error_notifications_slack_url,
                    await apk_error_notifications(process.env.ENVIRONMENT, activity_id, username, user_id, page, action_text, api, err))
                    .then(response => {
                        if (response.status == 200) {
                            console.log("Salck Message Sent!");
                            docClient.put(params, function (err, data) {
                                if (err) {
                                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                                    reject(err);
                                } else {
                                    resolve("Activity Added");
                                }
                            });
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        reject(error)
                    });
            }
            else {
                if (key.activity == "show") {
                    docClient.put(params, function (err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                            reject(err);
                        } else {
                            resolve("Activity Added");
                        }
                    });
                }
                else {
                    resolve("Activity Not Recorded")
                }
            }
        }
        else {
            resolve("Activity Not Recorded");
        }
    }))
}

const insertGameActivity = async (username, user_id, page, action_text, api, err) => {
    return new Promise((async (resolve, reject) => {
        if (process.env.ENVIRONMENT == "test" || process.env.ENVIRONMENT == "production") {
            const timestamp = +new Date()
            const activity_id = uuid.v4();
            const params = {
                TableName: game_table,
                Item: {
                    "type": "activity",
                    "id": activity_id,
                    "user_id": user_id,
                    "username": username,
                    "page": page,
                    "action": action_text,
                    "api_endpoint": api,
                    "timestamp": timestamp
                }
            };
            if (err && key.error_activity == "show") {
                params.Item.err = err;
                axios.post(key.apk_error_notifications_slack_url,
                    await apk_error_notifications(process.env.ENVIRONMENT, activity_id, username, user_id, page, action_text, api, err))
                    .then(response => {
                        if (response.status == 200) {
                            console.log("Salck Message Sent!");
                            docClient.put(params, function (err, data) {
                                if (err) {
                                    console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                                    reject(err);
                                } else {
                                    resolve("Activity Added");
                                }
                            });
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        reject(error)
                    });
            }
            else {
                if (key.activity == "show") {
                    docClient.put(params, function (err, data) {
                        if (err) {
                            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
                            reject(err);
                        } else {
                            resolve("Activity Added");
                        }
                    });
                }
                else {
                    resolve("Activity Not Recorded")
                }
            }
        }
        else {
            resolve("Activity Not Recorded");
        }
    }))
}

module.exports = { insertActivity, insertGameActivity }
