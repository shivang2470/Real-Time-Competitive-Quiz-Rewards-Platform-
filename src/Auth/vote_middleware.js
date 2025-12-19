var key = require("../../config/keys")
const { response } = require("../models/response")
const crypto = require("crypto")
const { insertActivity } = require("../models/activities")

module.exports = async (req, res, next) => {
    try {
        var encrypted_content = req.headers.vote_authorization_content
        var encryption_iv = req.headers.vote_authorization_iv
        const decipher = crypto.createDecipheriv(key.vote_aes_algo, key.vote_aes_key, encryption_iv);
        let decryptedData = decipher.update(encrypted_content, "hex", "utf-8");
        decryptedData += decipher.final("utf8");
        decryptedData = JSON.parse(decryptedData)
        if (decryptedData.string === key.voteEncryptedString) {
            req.vote_data = {
                "user_battle_id": decryptedData.user_battle_id,
                "voted_user_id": decryptedData.voted_user_id,
                "voted_username": decryptedData.voted_username
            }
            next()
        }
        else {
            await insertActivity(
                req.userData.username,
                req.userData.user_id,
                "vote auth",
                "Error occured while checking vote auth",
                req.url,
                "Authentication Failed")
            res.status(200).json(await response({ error: "Authentication Failed" }));
        }
    }
    catch (error) {
        // await insertActivity(
        //     req.userData.username,
        //     req.userData.user_id,
        //     "vote auth",
        //     "Error occured while checking vote auth",
        //     req.url,
        //     error)
        console.log(error)
        res.status(200).json(await response({ error: "Authentication Failed" }));
    }
}
