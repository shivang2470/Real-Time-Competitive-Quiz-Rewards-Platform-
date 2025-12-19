const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const loginDevicesSchema = new mongoose.Schema({
    app_id: {
        type: String,
        required: true
    },
    user_ids: {
        type: Object,
        required: true
    },
    updated_timestamp: {
        type: Number,
        required: true
    }
});

const loginDevicesModel = mongoose.model('login_devices', loginDevicesSchema);

module.exports = loginDevicesModel;
