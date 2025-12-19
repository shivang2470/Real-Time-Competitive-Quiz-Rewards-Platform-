const key = require('../../config/keys');
const axios = require('axios');
const {
    apk_login_notifications,
    apk_register_notifications,
    apk_other_notifications
} = require("./slack_templets")

const login_slack_push_notification = async (phone_number, username, user_id, coins, league) => {
    return new Promise((async (resolve, reject) => {
        try{
            if (key.login_activity == "show") {
                axios.post(key.apk_login_notifications_slack_url,
                    await apk_login_notifications(process.env.ENVIRONMENT, phone_number, username, user_id, coins, league))
                    .then(response => {
                        if (response.status == 200) {
                            console.log("Salck Message Sent!");
                            resolve("Notification Sent");
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        resolve("Notification Not Sent");
                    });
            }
            else {
                resolve("Notification Not Sent");
            }
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const register_slack_push_notification = async (user_id, phone_number, username, name) => {
    return new Promise((async (resolve, reject) => {
        try{
            if (key.register_activity == "show") {
                axios.post(key.apk_register_notifications_slack_url,
                    await apk_register_notifications(process.env.ENVIRONMENT, user_id, phone_number, username, name))
                    .then(response => {
                        if (response.status == 200) {
                            console.log("Salck Message Sent!");
                            resolve("Notification Sent");
                        }
                    })
                    .catch(error => {
                        console.log(error);
                        resolve("Notification Not Sent");
                    });
            }
            else {
                resolve("Notification Not Sent");
            }
        }
        catch(exec){
            reject(exec)
        }
    }))
}

const other_slack_push_notification = async (event, email, phone_number, username, user_id) => {
    return new Promise((async (resolve, reject) => {
        try{
            if (key.other_activity == "show") {
                axios.post(key.apk_other_notifications_slack_url,
                    await apk_other_notifications(event, email, phone_number, username, user_id))
                    .then(response => {
                        if (response.status == 200) {
                            console.log("Salck Message Sent!");
                            resolve("Notification Sent");
                        }
                    })
                    .catch(error => {
                        reject(error);
                    });
            }
            else {
                resolve("Notification Not Sent");
            }
        }
        catch(exec){
            reject(exec)
        }
    }))
}

module.exports = {
    login_slack_push_notification,
    register_slack_push_notification,
    other_slack_push_notification
}
