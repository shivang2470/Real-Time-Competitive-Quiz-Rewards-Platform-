const mongoose = require('mongoose')
const keys = require('../../config/keys')
let isConnected;

const connect = async () => {
    if (isConnected) {
        return;
    }
    const db = await mongoose.connect(keys.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
    });
    isConnected = db.connections[0].readyState;
    console.log('MongoDB Database connected');
    return isConnected;
};

module.exports = connect;
