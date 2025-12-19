const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const battlesSyncSchema = new mongoose.Schema({
    battle_id: {
        type: String,
        required: true
    },
    module: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    entry_fee: {
        type: String,
        required: true
    },
    entry_fee_type: {
        type: String,
        required: true
    },
    reward: {
        type: String,
        required: true
    },
    reward_type: {
        type: String,
        required: true
    },
    start_date: {
        type: Number,
        required: true
    },
    end_date: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const battlesSyncModel = mongoose.model('battlesSync', battlesSyncSchema);

module.exports = battlesSyncModel;
