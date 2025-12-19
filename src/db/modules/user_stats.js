const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const userStatsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    vote_count: {
        type: Number,
        default: 0
    },
    total_quiz_count: {
        type: Number,
        default: 0
    },
    quiz_count: {
        type: Object,
        default: {}
    },
    total_battles_count: {
        type: Number,
        default: 0
    },
    battles_count: {
        type: Object,
        default: {}
    },
    referral_count: {
        type: Number,
        default: 0
    },
    watch_ad_count: {
        type: Number,
        default: 0
    },
    total_ad_count: {
        type: Number,
        default: 0
    },
    ad_count: {
        type: Object,
        default: {}
    },
    requested_ad_count: {
        type: Object,
        default: {}
    },
    total_game_count: {
        type: Number,
        default: 0
    },
    game_count: {
        type: Object,
        default: {}
    },
    total_quiz_leaderboard_count: {
        type: Number,
        default: 0
    },
    quiz_leaderboard_count: {
        type: Object,
        default: {}
    },
    updated_timestamp: {
        type: Number,
        required: true
    }
});
const userStatsModel = mongoose.model('user_stats', userStatsSchema);

module.exports = userStatsModel;
