const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const overAllStatsSchema = new mongoose.Schema({
    stats_id: {
        type: Number,
        required: true 
    },
    users_count: {
        type: Number,
        default: 0
    },
    confirmed_users_count: {
        type: Number,
        default: 0
    },
    vote_count: {
        type: Number,
        default: 0
    },
    vote_reward_count: {
        type: Number,
        default: 0
    },
    quiz_count: {
        type: Number,
        default: 0
    },
    battle_count: {
        type: Number,
        default: 0
    },
    referral_count: {
        type: Number,
        default: 0
    },
    watch_ad_count: {
        type: Number,
        default: 0
    },
    ad_count: {
        type: Object,
        default: 0
    },
    quiz_leaderboard_count: {
        type: Object,
        default: 0
    },
    battles: {
        type: Object,
        default: {}
    },
    quizzes: {
        type: Object,
        default: {}
    },
    users: {
        type: Object,
        default: {}
    },
    confirmed_users: {
        type: Object,
        default: {}
    },
    watch_ads: {
        type: Object,
        default: {}
    },
    referrals: {
        type: Object,
        default: {}
    },
    votes: {
        type: Object,
        default: {}
    },
    vote_rewards: {
        type: Object,
        default: {}
    },
    ads: {
        type: Object,
        default: {}
    },
    game_count: {
        type: Number,
        default: 0
    },
    games: {
        type: Object,
        default: {}
    },
    quiz_leaderboard: {
        type: Object,
        default: {}
    },
    daily_active_users: {
        type: Object,
        default: {}
    },
    updated_timestamp: {
        type: Number,
        required: true
    }
});
const overAllStatsModel = mongoose.model('overall_stats', overAllStatsSchema);

module.exports = overAllStatsModel;
