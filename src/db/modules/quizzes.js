const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const quizSchema = new mongoose.Schema({
    quiz_id: {
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
    timestamp: {
        type: Number,
        required: true
    },
    reward_type: {
        type: String,
        required: true
    },
    reward: {
        type: Number,
        default: 0 
    },
    entry_fee_type: {
        type: String,
        required: true
    },
    entry_fee: {
        type: Number,
        required: true
    },
    reported_count: {
        type: Number,
        default: 0
    }
});
const quizModel = mongoose.model('quizzes', quizSchema);

module.exports = quizModel;
