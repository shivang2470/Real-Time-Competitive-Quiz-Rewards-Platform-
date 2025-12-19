const username = require("../../config/keys")['basic_auth_username']
const password = require("../../config/keys")['basic_auth_password']

// Middleware function to handle Basic Authentication
const basicAuth = (req, res, next) => {
    // Extract authorization header
    const authHeader = req.headers['authorization'];
    
    if (authHeader) {
        // Split the authorization header into "Basic" and the base64 encoded string
        const [, base64Credentials] = authHeader.split(' ');
        
        // Decode base64 string to get username and password
        const [api_username, api_password] = atob(base64Credentials).split(':');

        // Check if credentials are valid
        if (api_username === username && api_password === password) {
            // Valid credentials, proceed to the next middleware or route handler
            return next();
        }
    }
    
    // Invalid credentials, return 401 Unauthorized
    res.set('WWW-Authenticate', 'Basic realm="Authorization Required"');
    return res.status(405).json({message: "Authentication Failed", status_code: 405});
};

module.exports = {basicAuth}