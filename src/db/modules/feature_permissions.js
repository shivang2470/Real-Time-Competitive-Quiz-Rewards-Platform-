const mongoose = require('mongoose');
const mongoURI = require('../../../config/keys');

mongoose.connect(mongoURI.mongoURI, { useNewUrlParser: true });

const featurePermissionsSchema = new mongoose.Schema({
    user_id: {
        type: String,
        required: true
    },
    feature_permission_settings_id: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Number,
        required: true
    }
});
const featurePermissionsModel = mongoose.model('feature_permissions', featurePermissionsSchema);

module.exports = featurePermissionsModel;
