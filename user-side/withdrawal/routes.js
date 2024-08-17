const express = require("express");
const router = express.Router();
const {
  getWithdrawalPage,
  makeWithdrawal,
  createRecipientAndTransfer,
  rejectWithdrawal,
} = require("./controller");
const { requireAuthUser } = require("../../utils/authZ");

router.get("/", getWithdrawalPage);
router.post("/", makeWithdrawal);
router.post("/reject", rejectWithdrawal);
router.post("/approve", createRecipientAndTransfer);

module.exports = router;
