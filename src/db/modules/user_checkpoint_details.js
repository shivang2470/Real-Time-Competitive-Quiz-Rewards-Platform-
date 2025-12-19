const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const userCheckpointDetailsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    checkpoint_id: {
        type: Number,
        required: true
    },
    old_axpi: {
        type: Number,
        default: 0
    },
    new_axpi: {
        type: Number,
        default: 0
    },
    is_rewarded: {
        type: Boolean,
        default: false
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const userCheckpointDetailsModel = mongoose.model('user_checkpoint_details', userCheckpointDetailsSchema);

module.exports = userCheckpointDetailsModel;
