const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const userCoinsHistorySchema = new mongoose.Schema({
    module: {
        type: String,
        enum: ['battle', 'quiz', 'referral', "watch_ads", "redemption", "battle_blocked", "referral_leaderboard", "vote_reward", "game", "axpi_romp_conversion", "game_watch_ads", "quiz_leaderboard_watch_ad", "quiz_leaderboard", "checkpoint_crossed"],
        default: "battle"
    },
    user_battle_id: {
        type: Schema.Types.ObjectId,
        ref: 'user_battles'
    },
    referral_id: {
        type: Schema.Types.ObjectId,
        ref: 'referrals'
    },
    watch_ad_id: {
        type: Schema.Types.ObjectId,
        ref: 'watch_ads'
    },
    battle_id: {
        type: String,
        required: true
    },
    battle_name: {
        type: String,
        required: true
    },
    battle_image: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    entry_fee: {
        type: Number,
        required: true
    },
    entry_fee_type: {
        type: String,
        default: "AxPi"
    },
    reward_type: {
        type: String,
        default: "AxPi"
    },
    reward: {
        type: Number,
        required: true
    },
    coins: {
        type: String,
        required: true
    },
    axpi_romp: {
        type: String,
        default: "+0"
    },
    description: {
        type: String,
        required: true
    },
    redemption_request_id: {
        type: String
    },
    timestamp: {
        type: Number,
        required: true
    },
});

const userCoinsHistoryModel = mongoose.model('user_coins_history', userCoinsHistorySchema);

module.exports = userCoinsHistoryModel;
