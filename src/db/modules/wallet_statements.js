const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const walletStatementsSchema = new mongoose.Schema({
    wallet_id: {
        type: Schema.Types.ObjectId,
        ref: 'wallet'
    },
    user_id: {
        type: String,
        required: true
    },
    transaction_id: {
        type: String,
        required: true
    },
    ref_id: {
        type: String,
        default: null
    },
    balance: {
        type: Number,
        required: true
    },
    payment_type: {
        type: String,
        enum: ['CR', 'DR']
    },
    credit: {
        type: Number,
        default: 0
    },
    debit: {
        type: Number,
        default: 0
    },
    payment_mode: {
        type: String,
        enum: ['UPI', 'NEFT', 'IMPS', 'RTGS', 'DIGITAL', 'BANK ACCOUNT', 'AMAZON GIFT CARD'],
        default: 'DIGITAL'
    },
    payment_purpose: {
        type: String,
        default: ""
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

const walletStatementsModel = mongoose.model('wallet_statements', walletStatementsSchema);

module.exports = walletStatementsModel;
