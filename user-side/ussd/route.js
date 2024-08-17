const express = require("express");
const { ussdHandler } = require("./controller");
const router = express.Router();

router.post("/ussd", ussdHandler);

module.exports = router;


