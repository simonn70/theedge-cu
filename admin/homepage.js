const express = require("express");
const router = express.Router();
const {
  getHomepage,
  getMembers,
  getPendingWithdrawals,
  getReports,
  newMember,
  updateWithdrawal,
  insertMembers,
  updateMember,
} = require("./homepageController");

router.get("/homepage", getHomepage);
router.get("/members", getMembers);
router.post("/members", newMember);
router.post("/member/update", updateMember);
router.post("/bulkmembers", insertMembers);
router.get("/pendingwithdrawals", getPendingWithdrawals);
router.post("/approvewithdrawal", updateWithdrawal);
router.get("/reports", getReports);

module.exports = router;
