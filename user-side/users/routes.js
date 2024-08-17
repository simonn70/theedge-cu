const express = require("express");
const router = express.Router();
const {
  getUserLogin,
  postUserLogin,
  getUserSignUp,
  postUserSignUp,
  resetPasswordAndSetName
} = require("./controller");
const { getCustomerReports } = require("../../admin/homepageController");

router.get("/login", getUserLogin);
router.post("/login", postUserLogin);
router.get("/signup", getUserSignUp); 
router.post("/signup", postUserSignUp);
router.post("/reset", resetPasswordAndSetName);
router.get("/reports/", getCustomerReports);

module.exports = router;
