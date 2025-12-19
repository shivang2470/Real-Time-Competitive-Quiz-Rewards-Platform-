const AWS = require("aws-sdk");
const key = require("../../config/keys");
const { getSubCategoriesByCategoryId, getEventsFromSubCategory } = require("./index");

AWS.config.update({
  region: key.region,
  accessKeyId: key.AWS_ACCESS_KEY,
  secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
});

const table = key.table_ads;

const docClient = new AWS.DynamoDB.DocumentClient();

const getEvents = async (user_details) =>{
    const battles = await getSubCategoriesByCategoryId(key.battle_category_id);
    const quizzes = await getSubCategoriesByCategoryId(key.quiz_category_id);
    return {
        battles, quizzes
    }
}

const getEventDetail = async (event_id) =>{
  const event_details = await getEventsFromSubCategory(event_id);
  return {
    event_details
  }
}

module.exports = { getEvents, getEventDetail };
