const express = require("express");
const router = express.Router();
const withdrawal = require("./withdrawal/schema");
const deposit = require("./deposit/schema");

router.get("/", (req, res) => {
  const { userid } = req.body;
  const withdrawals = withdrawal.find({ userid });
  const deposits = deposit.find({ userid });
  res.status(200).send({
    withdrawals,
    deposits,
  });
});

module.exports = router;
