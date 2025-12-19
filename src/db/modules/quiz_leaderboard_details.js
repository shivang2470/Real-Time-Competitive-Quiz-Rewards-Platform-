const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const quizLeaderboardDetailsSchema = new mongoose.Schema({
    event_id: {
        type: String,
        required: true
    },
    quiz_leaderboard_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    correct_answers_count: {
        type: Number,
        required: true },
    total_questions_count: {
        type: Number,
        required: true
    },
    consider_quiz: {
        type: Boolean,
        required: true
    },
    result_declared: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const quizLeaderboardDetailsModel = mongoose.model('quiz_leaderboard_details', quizLeaderboardDetailsSchema);

module.exports = quizLeaderboardDetailsModel;
