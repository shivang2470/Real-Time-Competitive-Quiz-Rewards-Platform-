const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const logsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        default: ''
    },
    phone_number: {
        type: String,
        default: ''
    },
    username: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        required: true
    },
    file_name: {
        type: String,
        required: true
    },
    api: {
        type: String,
        default: ''
    },
    data: {
        type: String,
        default: ''
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const logsModel = mongoose.model('logs', logsSchema);

module.exports = logsModel;
