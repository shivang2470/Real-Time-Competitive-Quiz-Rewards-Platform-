const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const referralSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    referral_code: {
        type: String,
        required: true
    },
    referral_user_id: {
        type: String,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const referralModel = mongoose.model('referrals', referralSchema);

module.exports = referralModel;
