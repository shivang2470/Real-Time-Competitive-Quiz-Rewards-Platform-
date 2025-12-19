const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const toekenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true
    },
    type: {
        type: String,
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

const toeknModel = mongoose.model('tokens', toekenSchema);

module.exports = toeknModel;
