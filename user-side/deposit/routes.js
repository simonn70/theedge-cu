const express = require("express")
const router = express.Router()
const {
    getDepositPage, 
    makeDeposit,
    verifyPayment
} = require("./controller")
const { requireAuthUser } = require("../../utils/authZ")

router.get("/", getDepositPage)
router.get("/verify", verifyPayment);
router.post("/", makeDeposit)

module.exports = router