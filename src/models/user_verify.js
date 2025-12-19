const express = require('express');
const AWS = require('aws-sdk');
const key = require('../../config/keys');
const bcrypt = require("bcryptjs");
const { response } = require("../models/response")
const { insertActivity } = require("../models/activities")

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const tableUser = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const verify_user = async (phone_number, password) => {
    if(!(phone_number && password)){
        resolve({
            error: false,
            code: 400,
            message: "Phone Number and Password are required"
        });
    } else {
        const params = {
            TableName: tableUser,
            IndexName: 'type-phone_number-index',
            KeyConditionExpression: '#type = :hkey and phone_number = :phone_number',
            ExpressionAttributeNames: { '#type': 'type' },
            ExpressionAttributeValues: { ':hkey': key.userType, ':phone_number': parseInt(phone_number) }
        }
        return new Promise((async (resolve, reject) => {
            docClient.query(params, async function (findingUserErr, userData) {
                if (findingUserErr) {
                    await insertActivity(
                        phone_number,
                        "Unknown",
                        "login",
                        "Error while Login",
                        req.url,
                        findingUserErr);
                    reject({
                        error: true,
                        code: 500,
                        message: findingUserErr
                    });
                }
                else if (userData == null || userData.Items.length == 0) {
                    await insertActivity(
                        phone_number,
                        "Unknown",
                        "login",
                        "User Not Exists!",
                        "/login");
                    resolve({
                        error: false,
                        code: 404,
                        message: "User not exists"
                    });
                }
                else {
                        bcrypt.compare(password, userData.Items[0].password).then(async isMatch => {
                        if (isMatch) {
                            resolve({
                                error: false,
                                code: 200,
                                message: "Verified"
                            });
                        } else {
                            resolve({
                                error: false,
                                code: 403,
                                message: "Not Verified"
                            });
                        }
                    })
                }
            })
        }))
    }
}

module.exports = verify_user