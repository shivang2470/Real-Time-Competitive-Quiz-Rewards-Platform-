const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const dailyActiveUsersSchema = new mongoose.Schema({
    user_id: {
        type: String,
        default: ""
    },
    guest_user_id: {
        type: String,
        default: ""
    },
    module: {
        type: String,
        enum: ["talentitan", "talentitan_game"],
        default: "talentitan"
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const dailyActiveUsersModel = mongoose.model('daily_active_users', dailyActiveUsersSchema);

module.exports = dailyActiveUsersModel;
