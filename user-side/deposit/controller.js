const axios = require("axios");
const deposit = require("./schema");
require("dotenv").config();

const getDepositPage = (req, res) => {
  res.send("This is the deposit page");
};
const BASE_URL = "http://localhost:3000";
const PAYSTACK_SECRET_KEY = "sk_test_fcc05416469bb4e211d4f89d6870b5328dc847dc";
const makeDeposit = async (req, res) => {
  const { userid, email, amount, account, accountNumber } = req.body;

  //query for the user details

  try {
    const params = {
      email: email,
      amount: amount * 100,
      callback_url: `${BASE_URL}/succes-page`, // Replace with your actual callback URL
      // Paystack expects amount in kobo
    };

    const options = {
      method: "POST",
      url: "https://api.paystack.co/transaction/initialize",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      data: params,
    };

    const response = await axios(options);
    // tag pending
    const newDeposit = await deposit.create({
      email,
      userid,
      amount,
      account,
      accountNumber,
      reference: response.data.data.reference,
    });

    res.json({
      status: "success",
      message: "Deposit initialized successfully",
      data: response.data,
      newDeposit,
    });
  } catch (err) {
    console.error("Error during deposit initialization: ", err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const verifyPayment = async (req, res) => {
  const { reference } = req.query;
  //guery the deposit based on the ref and update the deposit success
  //based on the amt update the usr balance

  try {
    const options = {
      method: "GET",
      url: `https://api.paystack.co/transaction/verify/${reference}`,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const response = await axios(options);

    if (response.data.status && response.data.data.status === "success") {
      // update the deposit
      res.json({
        status: "success",
        message: "Payment verified successfully",
        data: response.data.data,
      });
    } else {
      res.status(400).json({
        status: "error",
        message: "Payment verification failed or payment was unsuccessful",
      });
    }
  } catch (error) {
    console.error("Error during payment verification: ", error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

module.exports = {
  getDepositPage,
  makeDeposit,
  verifyPayment,
};
