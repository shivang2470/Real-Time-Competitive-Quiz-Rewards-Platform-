const AWS = require('aws-sdk');
const key = require('../../config/keys');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const userTable = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {  }