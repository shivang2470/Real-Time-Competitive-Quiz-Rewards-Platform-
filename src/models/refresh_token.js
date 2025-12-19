const AWS = require('aws-sdk');
const key = require('../../config/keys');
const jwt = require('jsonwebtoken');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const userTable = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

const generate_refresh_token = async (username, user_id) => {
    return new Promise((async (resolve, reject) => {
        try{
            jwt.sign({ username, user_id }, key.refreshTokenJwtSecret, async function (jwtErr, refresh_token) {
                if(jwtErr){
                    reject(jwtErr)
                }
                else{
                    const params = {
                        TableName: userTable,
                        Key: {
                            "type": key.userType,
                            "id": user_id
                        },
                        UpdateExpression: "set refresh_token = :val",
                        ExpressionAttributeValues: {
                            ":val": refresh_token
                        }
                    };
                    docClient.update(params, async (updateErr, updatedData) => {
                        if (updateErr) {
                            reject(updateErr)
                        } else {
                            resolve(refresh_token)
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

module.exports = { generate_refresh_token }