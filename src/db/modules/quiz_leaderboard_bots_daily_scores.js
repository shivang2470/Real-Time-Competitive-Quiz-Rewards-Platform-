const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const quizLeaderboardBotsDailyScoresSchema = new mongoose.Schema({
    event_id: {
        type: String,
        required: true
    },
    quiz_leaderboard_id: {
        type: String,
        required: true
    },
    bots: {
        type: Array,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const quizLeaderboardBotsDailyScoresModel = mongoose.model('quiz_leaderboard_bots_daily_scores', quizLeaderboardBotsDailyScoresSchema);

module.exports = quizLeaderboardBotsDailyScoresModel;
