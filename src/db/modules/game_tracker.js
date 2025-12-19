const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const gameTrackerSchema = new mongoose.Schema({
    game_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    level: {
        type: String,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const gameTrackerModel = mongoose.model('game_tracker', gameTrackerSchema);

module.exports = gameTrackerModel;
