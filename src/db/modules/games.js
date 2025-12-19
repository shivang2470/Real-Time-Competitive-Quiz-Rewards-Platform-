const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const gameSchema = new mongoose.Schema({
    game_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
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
const gameModel = mongoose.model('games', gameSchema);

module.exports = gameModel;
