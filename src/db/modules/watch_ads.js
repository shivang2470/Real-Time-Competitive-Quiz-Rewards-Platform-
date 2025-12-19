const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const watchAdsSchema = new mongoose.Schema({
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
const watchAdsModel = mongoose.model('watch_ads', watchAdsSchema);

module.exports = watchAdsModel;
