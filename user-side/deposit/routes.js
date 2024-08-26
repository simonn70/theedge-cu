const express = require("express");
const router = express.Router();
const {
  getDepositPage,
  makeDeposit,
  verifyPayment,
  manualDeposit,
} = require("./controller");
const { requireAuthUser } = require("../../utils/authZ");

router.get("/", getDepositPage);
router.get("/verify", verifyPayment);
router.post("/", makeDeposit);
router.post("/manual", manualDeposit);

module.exports = router;
