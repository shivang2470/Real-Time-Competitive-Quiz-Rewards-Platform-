const AWS = require('aws-sdk')
const key = require("../../config/keys")
const s3 = new AWS.S3()

AWS.config.update({
    accessKeyId: key.AWS_ACCESS_KEY,
    secretAccessKey: key.AWS_SECRET_ACCESS_KEY,
    signatureVersion: 'v4'
})


const getPreSignedURL = async (bucket_name, my_key) => {
    const myBucket = bucket_name
    const myKey = my_key
    const signedUrlExpireSeconds = 60 * 5
    return new Promise(((resolve, reject) => {
        const url = s3.getSignedUrl('putObject', {
            Bucket: myBucket,
            Key: myKey,
            Expires: signedUrlExpireSeconds,
            ACL: 'public-read'
        })
        const data = {
            pre_signed_url: url,
            image_url: key.location_users_bucket + myKey
        }
        resolve(data)
    }))
}

module.exports = getPreSignedURL;
