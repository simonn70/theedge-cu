const express = require("express");
const router = express.Router();
const {
  getWithdrawalPage,
  makeWithdrawal,
  createRecipientAndTransfer,
  rejectWithdrawal,
  manualWithdrawal,
  withdrawal,
  Withdrawals,
} = require("./controller");
const { requireAuthUser } = require("../../utils/authZ");

router.get("/", getWithdrawalPage);
router.post("/", makeWithdrawal);
router.post("/manual", manualWithdrawal);
router.post("/reject", rejectWithdrawal);
router.post("/approve", Withdrawals);

module.exports = router;
