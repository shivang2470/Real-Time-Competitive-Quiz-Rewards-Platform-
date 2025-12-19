const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const walletSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    balance: {
        type: Number,
        required: true
    },
    updated_at: {
        type: Number,
        required: true
    },
    created_at: {
        type: Number,
        required: true
    }
});

const walletModel = mongoose.model('wallet', walletSchema);

module.exports = walletModel;
