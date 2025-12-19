const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const gameWatchAdsSchema = new mongoose.Schema({
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
const gameWatchAdsModel = mongoose.model('game_watch_ads', gameWatchAdsSchema);

module.exports = gameWatchAdsModel;
