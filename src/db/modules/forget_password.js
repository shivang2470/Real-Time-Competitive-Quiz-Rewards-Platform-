const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const ForgetPasswordSchema = new mongoose.Schema({
    phone_number: {
        type: String,
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

ForgetPasswordSchema.pre('save', function (next) {
    this.updated_at = Date.now();
    next();
});

ForgetPasswordSchema.pre('updateOne', function (next) {
    this.set({ updated_at: Date.now() });
    next();
});

ForgetPasswordSchema.pre('update', function (next) {
    this.set({ updated_at: Date.now() });
    next();
});

const ForgetPasswordModel = mongoose.model('forget_password', ForgetPasswordSchema);

module.exports = ForgetPasswordModel;
