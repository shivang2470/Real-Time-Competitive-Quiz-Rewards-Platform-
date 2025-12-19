const constants = require('../../config/constants');
const { inAppNotification } = require('../cache/common_cache');
const inAppNotificationModel = require('../db/modules/in_app_notifications')

const message_acknowledge = async (user_id) => {
    const data = inAppNotificationModel.findOne({ user_id: user_id, seen: false });
    return new Promise((async (resolve, reject) => {
        try{
            data.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    const update_seen = inAppNotificationModel.updateOne({ user_id: user_id, seen: false }, {$set: {seen: true}});
                    update_seen.exec(async function (err, update_data) {
                        if (err) {
                            reject(err);
                        }
                        else {
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

const add_message = async (item) => {
    const new_data = new inAppNotificationModel(item)
    return new Promise(((resolve, reject) => {
        try{
            new_data.save(async function (err, result) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(result);
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const get_message = async (user_id) => {
    const data = inAppNotificationModel.find({ user_id: user_id, seen: false }, {"notification_text": 1, "notification_header": 1, "timestamp": 1}).sort({ "timestamp": -1 });
    return new Promise((async (resolve, reject) => {
        try{
            data.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const message_acknowledge_v2 = async (user_id) => {
    return new Promise((async (resolve, reject) => {
        try{
            const update_seen = inAppNotificationModel.updateMany({ user_id: user_id, seen: false }, {$set: {seen: true}});
            update_seen.exec(async function (err, update_data) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(update_data)
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const get_old_messages = async (user_id) => {
    const data = inAppNotificationModel.find({ user_id: user_id, seen: true }, {"notification_text": 1, "notification_header": 1, "timestamp": 1}).sort({ "timestamp": -1 });
    return new Promise((async (resolve, reject) => {
        try{
            data.exec(async function (err, data) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(data);
                }
            })
        }
        catch(exec){
            reject(exec)
        }
    }))
}

module.exports =  { message_acknowledge, add_message, get_message, message_acknowledge_v2, get_old_messages }