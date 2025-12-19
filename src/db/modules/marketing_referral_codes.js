const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const marketingReferralCodeSchema = new mongoose.Schema({
    referral_code: {
        type: String,
        required: true
    },
    reward: {
        type: Number,
        required: true
    },
    reward_type: {
        type: String,
        required: true
    }
});
const marketingReferralCodeModel = mongoose.model('marketing_referral_codes', marketingReferralCodeSchema);

module.exports = marketingReferralCodeModel;