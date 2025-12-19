const mongoose = require('mongoose');

const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const externalAdsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    ad_platform_id: {
        type: Number,
        required: true
    },
    ad_unit_id: {
        type: String,
        required: true
    },
    ad_type_id: {
        type: Number,
        required: true
    },
    show_ad: {
        type: Boolean,
        default: false
    },
    ad_id: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const externalAdsModel = mongoose.model('external_ads', externalAdsSchema);

module.exports = externalAdsModel;
