const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const orderSchema = new mongoose.Schema({
    wallet_statements_id: {
        type: Schema.Types.ObjectId,
        ref: 'wallet_statements'
    },
    ref_id: {
        type: String,
        default: ''
    },
    transaction_id: {
        type: String,
        default: ''
    },
    user_id: {
        type: String,
        required: true
    },
    product_price: {
        type: Number,
        default: 0
    },
    amount: {
        type: Number,
        default: 0
    },
    payment_mode: {
        type: String,
        enum: ['UPI', 'NEFT', 'IMPS', 'RTGS', 'DIGITAL', 'BANK ACCOUNT'],
        default: 'DIGITAL'

    },
    payment_purpose: {
        type: String,
        default: ""
    },
    email_id: {
        type: String,
        default: ''
    },
    mobile_number: {
        type: String,
        default: ''
    },
    custom_identifier: {
        type: String,
        default: ''
    },
    product_id: {
        type: String,
        default: ''
    },
    product_name: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['SUCCESSFUL', 'FAILED', 'PENDING', 'REVERSED', 'CANCELED'],
        default: 'PENDING'
    },
    meta_data: {
        type: Object,
        default: {}
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

const orderModel = mongoose.model('orders', orderSchema);

module.exports = orderModel;
