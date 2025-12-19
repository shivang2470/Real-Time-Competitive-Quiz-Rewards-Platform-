const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const votersSchema = new mongoose.Schema({
    voter_user_id: {
        type: String,
        required: true
    },
    voter_username: {
        type: String,
        required: true
    },
    voter_avatar: {
        type: String,
        required: true
    },
    voted_player_id: {
        type: String,
        required: true
    },
    user_battle_id: {
        type: Schema.Types.ObjectId,
        ref: 'user_battles'
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const votersModel = mongoose.model('voters', votersSchema);

module.exports = votersModel;
