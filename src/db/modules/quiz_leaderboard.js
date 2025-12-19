const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const quizLeaderboardSchema = new mongoose.Schema({
    event_id: {
        type: String,
        required: true
    },
    quiz_leaderboard_id: {
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
    quiz_leaderboard_data: {
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
const quizLeaderboardModel = mongoose.model('quiz_leaderboard', quizLeaderboardSchema);

module.exports = quizLeaderboardModel;
