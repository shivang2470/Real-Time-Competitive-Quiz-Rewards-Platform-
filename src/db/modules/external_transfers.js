const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const externalTransfersSchema = new mongoose.Schema({
    ref_id: {
        type: String,
        default: null
    },
    transaction_id: {
        type: String,
        required: true
    },
    user_id: {
        type: String,
        required: true
    },
    order_id: {
        type: String,
        default: null
    },
    payment_mode: {
        type: String,
        enum: ['UPI', 'NEFT', 'IMPS', 'RTGS', 'DIGITAL', 'BANK ACCOUNT'],
        default: 'DIGITAL'
    },
    product_id: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['SUCCESSFUL', 'FAILED', 'PENDING', 'REVERSED', 'CANCELED', 'INITIATED'],
        default: 'INITIATED'
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

const externalTransfersModel = mongoose.model('external_transfers', externalTransfersSchema);

module.exports = externalTransfersModel;
