const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const OTPSchema = new mongoose.Schema({
    phone_number: {
        type: String,
        required: true
    },
    otp: {
        type: Number,
        required: true
    },
    blocked: {
        type: Boolean,
        default: false
    },
    count: {
        type: Number,
        default: 1
    },
    resend_otp_count: {
        type: Number,
        default: 0
    },
    ttl: {
        type: Number,
        required: true
    },
    created_at: {
        type: Number,
        default: () => Date.now()
    },
    updated_at: {
        type: Number,
        default: () => Date.now()
    },
});

OTPSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

OTPSchema.pre('updateOne', function (next) {
    this.set({ updated_at: Date.now() });
    next();
});

OTPSchema.pre('update', function (next) {
    this.set({ updated_at: Date.now() });
    next();
});

const OTPModel = mongoose.model('OTP', OTPSchema);

module.exports = OTPModel;
