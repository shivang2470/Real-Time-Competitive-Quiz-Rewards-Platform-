const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const referralLeaderboardSchema = new mongoose.Schema({
    referral_leaderboard_id: {
        type: String,
        required: true
    },
    start_timestamp: {
        type: String,
        required: true
    },
    end_timestamp: {
        type: String,
        required: true
    },
    referral_data: {
        type: Object,
        required: true
    },
    result_declare: {
        type: Boolean,
        default: false
    },
    updated_at:{
        type: Number,
        required: true
    }
});
const referralLeaderboardModel = mongoose.model('referral_leaderboard', referralLeaderboardSchema);

module.exports = referralLeaderboardModel;
