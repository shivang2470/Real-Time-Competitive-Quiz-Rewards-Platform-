const apk_error_notifications = async (environment, activity_id, username, user_id, page, action_text, api, err) => {
     return {
        "type": "error",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Error at ${api}`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `ENVIRONMENT: *${environment}*`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Activity Id:\n${activity_id}`
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": "*See User Activity:*\n <talentitan.com>"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Description:*\n" + action_text
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Page:*\n" + page
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Username/Phone Number:*\n" + username
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*User ID:*\n" + user_id
                    }
                ]
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Error:\n${err}`
                }
            },
        ]
    }
}

const apk_login_notifications = async (environment, phone_number, username, user_id, coins, league) => {
    return {
        "type": "Login",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Login by ${username}`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Enviroment: ${environment}`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Phone Number:\n${phone_number}`
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": "Description:\nUser Logins"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*User Id:*\n" + user_id
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*AxPi:*\n" + coins
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*League:*\n" + league
                    }
                ]
            },
        ]
    }
}

const apk_register_notifications = async (environment, user_id, phone_number, username, name) => {
    return {
        "type": "Login",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Enviroment: ${environment}`
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": "Name:\n" + name
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*User Id:*\n" + user_id
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Username:*\n" + username
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*League/Phone Number:*\n" + phone_number
                    }
                ]
            },
        ]
    }
}

const apk_other_notifications = async (event, email, phone_number, username, user_id) => {
    return {
        "type": event,
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Event: ${event}`
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": "Email:\n" + email
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*User Id:*\n" + user_id
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Username:*\n" + username
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Phone Number:*\n" + phone_number
                    }
                ]
            },
        ]
    }
}

const user_coins_not_matches_notifications = async (environment, username, user_id, saved_coins, calculated_coins) => {
    return {
        "type": "***USER AxPi NOT MATCHES***",
        "blocks": [
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Username by ${username}`
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": `Enviroment: ${environment}`
                }
            },
            {
                "type": "section",
                "fields": [
                    {
                        "type": "mrkdwn",
                        "text": "Description:\nUser Saved AxPi not matches with calculated AxPi"
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*User Id:*\n" + user_id
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Saved AxPi:*\n" + saved_coins
                    },
                    {
                        "type": "mrkdwn",
                        "text": "*Calculated AxPi:*\n" + calculated_coins
                    }
                ]
            },
        ]
    }
}

module.exports = {
    apk_error_notifications,
    apk_login_notifications,
    apk_register_notifications,
    apk_other_notifications,
    user_coins_not_matches_notifications
}
