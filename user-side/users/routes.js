const express = require("express");
const router = express.Router();
const {
  getUserLogin,
  postUserLogin,
  getUserSignUp,
  postUserSignUp,
  resetPasswordAndSetName,
  sendPasswordResetEmail,
  resetPassword,
  getUsersByPosition,
  addNewStaff
} = require("./controller");
const { getCustomerReports } = require("../../admin/homepageController");

router.get("/login", getUserLogin);
router.get("/", getUsersByPosition);
router.post("/login", postUserLogin);
router.get("/signup", getUserSignUp); 
router.post("/signup", postUserSignUp);
router.post("/staff", addNewStaff);
router.post("/reset", resetPasswordAndSetName);
router.post("/verify", sendPasswordResetEmail);
router.post("/pass-reset", resetPassword);
router.get("/reports/", getCustomerReports);

module.exports = router;
