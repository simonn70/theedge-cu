const express = require("express");
const router = express.Router();
const {
  getBankLoginPage,
  postBankLoginPage,
  postBankSignupPage,
} = require("./controller");

router.get("/", getBankLoginPage);
router.post("/signup", postBankSignupPage);

module.exports = router;
