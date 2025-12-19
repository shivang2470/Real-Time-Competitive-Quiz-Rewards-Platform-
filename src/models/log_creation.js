const { getUserByUserId, getUserByPhoneNumber } = require(".");
const errorLogsModel = require("../db/modules/error_logs");
const logsModel = require("../db/modules/logs");

const createLog = async (message, file_name, user_id='', api='', data='', phone_number='') => {
    console.log("\n");
    let user_details = {}
    if(user_id){
        console.log("\x1b[32m" + "User ID " + user_id + "\x1b[37m");
        user_data = await getUserByUserId(user_id)
        user_details = user_data[0]
    }
    if(phone_number){
        console.log("\x1b[32m" + "Phone Number " + phone_number + "\x1b[37m");
        user_details = await getUserByPhoneNumber(phone_number)
    }
    console.log("Message:" + JSON.stringify(message));
    console.log("File Name: " + file_name);
    if(api)
        console.log("API: " + api);
    if(data)
        console.log("Data: " + JSON.stringify(data));
    const items = {
        user_id: user_id,
        phone_number: phone_number,
        message: message,
        file_name: file_name,
        api: api,
        data: JSON.stringify(data),
        timestamp: +new Date()
    }
    if(Object.keys(user_details).length){
        items['username'] = user_details.username
    }
    await new logsModel(items).save()
}

const createErrorLog = async ( message, file_name, line_number, user_id='', api='', data='', priority='very high') => {
    console.log("\n");
    if(user_id)
        console.error("\x1b[32m" + "User ID " + user_id + "\x1b[37m");
    console.error("Message:" + JSON.stringify(message));
    console.error("File Name: " + file_name);
    console.error("Line Number: " + line_number);
    if(api)
        console.error("API: " + api);
    if(data)
        console.log("Data: " + JSON.stringify(data));
    await new errorLogsModel({
        user_id: user_id,
        message: message,
        file_name: file_name,
        line_number: line_number,
        api: api,
        data: JSON.stringify(data),
        priority: priority,
        timestamp: +new Date()
    }).save()
}

module.exports = {createLog, createErrorLog}