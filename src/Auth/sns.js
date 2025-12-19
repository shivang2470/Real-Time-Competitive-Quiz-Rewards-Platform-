// // We need to use the sns-mobile module
// var SNS = require('sns-mobile');
// const keys = require("../../config/keys")
// // Some environment variables configured
// // You don't want your keys in the codebase
// // in plaintext
// var SNS_KEY_ID = keys.AWS_SECRET_ACCESS_KEY,
//     SNS_ACCESS_KEY = keys.AWS_ACCESS_KEY;

// // This is an application we created via the
// // SNS web interface in the section
// // Creating a GCM Platform Application (Android)
// var ANDROID_ARN = keys.sns_arn;

// // Object to represent the PlatformApplication
// // we're interacting with
// var myApp = new SNS({
//     platform: SNS.SUPPORTED_PLATFORMS.ANDROID,
//   // If using iOS change uncomment the line below
//   // and comment out the 'android' one above
//   // platform: 'ios',
//   region: keys.region,
//   apiVersion: '2010-03-31',
//   accessKeyId: SNS_ACCESS_KEY,
//   secretAccessKey: SNS_KEY_ID,
//   platformApplicationArn: ANDROID_ARN
// });

// // Handle user added events
// myApp.on('userAdded', function(endpointArn, deviceId) {
//   console.log('\nSuccessfully added device with deviceId: ' + deviceId + '.\nEndpointArn for user is: ' + endpointArn);

//   var message = 'Thanks for using Push Notifications';

//     myApp.sendMessage(endpointArn, message, function(err, messageId) {
//     if(err) {
//         console.log('An error occured sending message to device %s', endpointArn);
//             console.log(err);
//         } else {
//         console.log('Successfully sent a message to device %s. MessageID was %s', endpointArn, messageId);
//         }
//     });
// });

// // Publically exposed function
// // Recieves request and response objects
// // This is used by index.js
// exports.register = function(req, res, next) {
//     var deviceId = "4fe87af471c2dfb9"
//     if(req.query.device_id){
//         deviceId = req.query.device_id
//     }
//   console.log('\nRegistering user with deviceId: ' + deviceId);
//   // Add the user to SNS
//   myApp.addUser(deviceId, null, function(err, endpointArn) {
//     // SNS returned an error
//     if(err) {
//       console.log(err);
//       res.status(200).json({
//         status_code: 500,
//         message: 'Error in sending notification'
//       });
//     }

//   // Tell the user everything's ok
//   next()
//   });
// };