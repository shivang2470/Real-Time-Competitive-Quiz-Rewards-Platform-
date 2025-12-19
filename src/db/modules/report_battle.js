const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const reportBattleSchema = new mongoose.Schema({
    reporter_user_id: {
        type: String,
        required: true
    },
    reporter_username: {
        type: String,
        required: true
    },
    reported_battle_id: {
        type: Schema.Types.ObjectId,
        ref: 'user_battles',
        required: true
    },
    report_option: {
        type: String,
        required: true
    },
    remark: {
        type: String
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const reportBattleModel = mongoose.model('reported_battles', reportBattleSchema);

module.exports = reportBattleModel;
