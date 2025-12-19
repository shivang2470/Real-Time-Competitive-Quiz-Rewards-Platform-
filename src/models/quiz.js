const AWS = require('aws-sdk');
const { getUserByUserId } = require('.');
const key = require('../../config/keys');
const quizModel = require('../db/modules/quizzes');

AWS.config.update({
    region: key.region,
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY
});

const table = key.tableCMS;
const userTable = key.tableUser;

const docClient = new AWS.DynamoDB.DocumentClient();

function getRandom(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const question_time = {'less': 20, '15': 30, '40': 50, '70': 80, 'other': 120}

const getQuestionCount = async (id) => {
    const params = {
        TableName: table,
        IndexName: "parent_id-index-index",
        KeyConditionExpression: '#parent_id=:hkey2',
        ExpressionAttributeNames: { '#parent_id': 'parent_id' },
        ExpressionAttributeValues: { ':hkey2': id },
        Select:'COUNT'
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(params, async function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    }))
}

const getBattleQuestions = async (id) => {
    const question_count = await getQuestionCount(id);
    const indexe_arr = []
    const questions = []
    return new Promise((async (resolve, reject) => {
    while(1){
    const index = getRandom(1, parseInt(question_count.Count))
    if(!indexe_arr.includes(index)){
        indexe_arr.push(index)
        if(indexe_arr.length >= 6)
            break;
        const params = {
            TableName: table,
            IndexName: "parent_id-index-index",
            KeyConditionExpression: '#parent_id=:hkey and #index=:hkey2',
            ExpressionAttributeNames: { '#parent_id': 'parent_id', '#index': 'index', '#path': 'path', '#description': 'description' },
            ExpressionAttributeValues: { ':hkey': id, ':hkey2': parseInt(index)},
            ProjectionExpression: 'id,#parent_id,question,#index,option1,option2,option3,option4,correctans,#path,#description',
        };
        docClient.query(params, async function (err, data) {
            if (err)
                reject(err)
            else {
                    const question = data.Items[0].question
                    let time_to_give = question_time['less']
                    if(question.split(" ").length > 15 && question.split(" ").length <= 25){
                        time_to_give = question_time['15']
                    }
                    else if(question.split(" ").length > 25 && question.split(" ").length <= 40){
                        time_to_give = question_time['40']
                    }
                    else if(question.split(" ").length > 40 && question.split(" ").length <= 70){
                        time_to_give = question_time['70']
                    }
                    else if(question.split(" ").length > 70){
                        time_to_give = question_time['other']
                    }
                    questions.push({
                        id: data.Items[0].id,
                        index: data.Items[0].index,
                        question: data.Items[0].question,
                        question_file: data.Items[0].path ? data.Items[0].path:"",
                        type: data.Items[0].path ? "image": "text",
                        option1: data.Items[0].option1,
                        option2: data.Items[0].option2,
                        option3: data.Items[0].option3,
                        option4: data.Items[0].option4,
                        question_time: (data.Items[0].path || id == "77793c5f-5eae-4195-92b9-cc67a37a48a2")? question_time['other']: time_to_give,
                        correct_answer: data.Items[0].correctans,
                        description: data.Items[0].description
                    })
                    if(questions.length == 5)
                        resolve(questions)
                    }
                })
            }
        }
    }))
};

const getQuestionAnswer = async (question_id) => {
    const params = {
        TableName: table,
        KeyConditionExpression: '#type=:hkey and #id=:hkey2',
        ExpressionAttributeNames: { '#type': 'type', '#id': 'id' },
        ExpressionAttributeValues: { ':hkey': 'Question', ':hkey2': question_id },
        ProjectionExpression: 'correctans, description',
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(params, async function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve({correct_answer: data.Items[0].correctans, description: data.Items[0].description});
            }
        })
    }))
}

const getQuizIdByQuestionId = async (question_id) => {
    const params = {
        TableName: table,
        KeyConditionExpression: '#type=:hkey and #id=:hkey2',
        ExpressionAttributeNames: { '#type': 'type', '#id': 'id' },
        ExpressionAttributeValues: { ':hkey': 'Question', ':hkey2': question_id },
        ProjectionExpression: 'parent_id',
    };
    return new Promise((async (resolve, reject) => {
        docClient.query(params, async function (err, data) {
            if (err) {
                reject(err);
            } else {
                resolve({quiz_id: data.Items[0].parent_id});
            }
        })
    }))
}

const quiz_answer_coin_check = async (see_quiz_answer_fee, user_id) => {
    const user_detail = await getUserByUserId(user_id)
    if(user_detail[0]["coins"] >= see_quiz_answer_fee){
        return true
    }
    else{
        return false
    }
}

const userCurrentQuizCount = async (quiz_id, user_id) => {
    const datetime = +new Date(new Date().setHours(0,0,0,0));
    let quiz_query = quizModel.find({
        user_id: user_id, quiz_id: quiz_id, timestamp: {$gte: datetime}
    }).count()
    return new Promise((async (resolve, reject) => {
        try{
            quiz_query.exec(async function (err, count) {
                if (err) {
                    reject(err)
                }
                else {
                    resolve(count);
                }
            })
        }
        catch(err){
            reject(err);
        }
    }))
}

const getQuizPublishedStatus = async (id) => {
    const params = {
        TableName: table,
        KeyConditionExpression: '#type=:hkey1 and #id=:hkey2',
        ExpressionAttributeNames: { '#id': 'id', '#type': 'type' },
        ExpressionAttributeValues: { ':hkey1': "Battle", ':hkey2': id },
        ProjectionExpression: "is_published",
    };
    return new Promise(async (resolve, reject) => {
        try {
        docClient.query(params, async (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data.Items[0].is_published);
            }
        });
        } catch (exec) {
            reject(exec);
        }
    });
};
module.exports = { getBattleQuestions, getQuestionAnswer, getQuizIdByQuestionId, quiz_answer_coin_check, userCurrentQuizCount, getQuizPublishedStatus }