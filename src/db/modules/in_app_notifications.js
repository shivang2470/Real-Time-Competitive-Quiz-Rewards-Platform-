const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const inAppNotification = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    seen: {
        type: Boolean,
        default: false
    },
    notification_text: {
        type: String
    },
    notification_header: {
        type: String,
        required: true
    },
    page: {
        type: String,
        enum: ['home', 'my_games', 'coins', "battles", "redemption", "more"],
        default: "home"
    },
    timestamp: {
        type: Number,
        required: true
    }
});

const inAppNotificationModel = mongoose.model('in_app_notifications', inAppNotification);

module.exports = inAppNotificationModel;
