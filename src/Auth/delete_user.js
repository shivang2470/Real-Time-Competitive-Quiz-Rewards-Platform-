const express = require("express");
const {
  getUserByUserId,
  copyUserDataDelete,
  deleteUserByIdAndType,
  deleteFromLoginDevice,
  getUserByPhoneNumber,
} = require("../models");
const jwtAuth = require('../Auth/auth')
const apiKeyAuth = require('../Auth/api_key_auth');
const verify_user = require("../models/user_verify");

const router = express.Router();

router.delete("/", jwtAuth, async (req, res) => {
  const user_id = req.userData.user_id
  try {
    const user = await getUserByUserId(user_id);
    const newUser = { 
      ...user[0],
      type: "deleted_user",
      id: user_id,
      deleted_phone_number: user[0]['phone_number'],
      deleted_username: user[0]['username'],
      username: "deleted_user",
      phone_number: 0
    };
    await copyUserDataDelete(newUser);
    await deleteUserByIdAndType("user", user_id);
    await deleteFromLoginDevice(req.userData.app_id)
    res.status(200).json({
      success: true,
      message: "User deleted"
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

router.delete("/web", apiKeyAuth, async (req, res) => {
  await verify_user(req.body.phone_number, req.body.password).catch(async err => {
    return res.status(500).json(await responseError())
  }).then(async response => {
    if(response.code == 200) {
      const user_data = await getUserByPhoneNumber(req.body.phone_number)
      const user_id = user_data.id
      try {
        const newUser = { 
          ...user_data,
          type: "deleted_user",
          id: user_id,
          deleted_phone_number: user_data['phone_number'],
          deleted_username: user_data['username'],
          username: "deleted_user",
          phone_number: 0
        };
        await copyUserDataDelete(newUser);
        await deleteUserByIdAndType("user", user_id);
        res.status(200).json({
          success: true,
          message: "User deleted"
        });
      } catch (error) {
        // console.log(error)
        res.status(400).json({ error: String(error) });
      }
    } else {
      res.status(response.code).json({ error: response.message });
    }
  })
});

module.exports = router;
