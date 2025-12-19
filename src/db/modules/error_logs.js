const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const errorLogsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    file_name: {
        type: String,
        required: true
    },
    line_number: {
        type: String
    },
    api: {
        type: String,
        default: ''
    },
    data: {
        type: String,
        default: ''
    },
    priority: {
        type: String,
        enum: ['very low', 'low', 'medium', 'high', "very high"],
        default: "very high"
    },
    resolved: {
        type: Boolean,
        default: false
    },
    assignee: {
        type: String,
        default: 'Unassigned'
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const errorLogsModel = mongoose.model('error_logs', errorLogsSchema);

module.exports = errorLogsModel;
