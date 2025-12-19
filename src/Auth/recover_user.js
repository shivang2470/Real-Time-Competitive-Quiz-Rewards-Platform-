const express = require("express");
const {
  recoverUserDataDeleted,
  getDeletedUserByUserId,
  deleteUserByIdAndType
} = require("../models/index");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const user = await getDeletedUserByUserId(id);
    const userid = uuidv4();
    const newUser = { ...user[0], type: "user", id: userid };
    await recoverUserDataDeleted(newUser);
    await deleteUserByIdAndType("deleted_user", id);

    res.status(200).json({
      success: true,
      message: "User Recovered",
      userid,
    });
  } catch (error) {
    res.status(400).json({ error: String(error) });
  }
});

module.exports = router;
