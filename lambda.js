const awsServerlessExpress = require('aws-serverless-express');
const app = require('./app'); // Import your Express app

// Create the server
const server = awsServerlessExpress.createServer(app);

// Export the Lambda handler
exports.handler = (event, context) => {
    awsServerlessExpress.proxy(server, event, context);
};