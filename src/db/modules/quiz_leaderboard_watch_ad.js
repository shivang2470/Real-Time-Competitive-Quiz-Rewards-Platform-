const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const quizLeaderboardWatchAdsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    ad_watched: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const quizLeaderboardWatchAdsModel = mongoose.model('quiz_leaderboard_watch_ads', quizLeaderboardWatchAdsSchema);

module.exports = quizLeaderboardWatchAdsModel;
