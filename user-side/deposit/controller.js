const axios = require("axios");
const deposit = require("./schema");
const User = require("../users/schema");
const { sendSMS } = require("../../utils/sendSMS");
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
    const user = await User.findOne({ accountNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const params = {
      email: email,
      amount: amount * 100,
      // callback_url: `${BASE_URL}/succes-page`, // Replace with your actual callback URL
      // Paystack expects amount in kobo
    };
    const depositAmount = parseFloat(amount);
    const options = {
      method: "POST",
      url: "https://api.paystack.co/transaction/initialize",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      data: params,
      channels: ["card", "mobile_money"],
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

    if (account === "shares") {
      user.sharesBalance += depositAmount;
    } else if (account === "savings") {
      user.savingsBalance += depositAmount;
    } else {
      return res.status(400).json({ message: "Invalid account type" });
    }

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

const manualDeposit = async (req, res) => {
  const { userid, email, amount, account, accountNumber } = req.body;

  try {
    // Find the user by account number
    const user = await User.findOne({ accountNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure that the amount is treated as a number
    const depositAmount = parseFloat(amount);

    // Update the user's balance based on the account type
    if (account === "shares") {
      user.sharesBalance += depositAmount;
    } else if (account === "savings") {
      user.savingsBalance += depositAmount;
    } else {
      return res.status(400).json({ message: "Invalid account type" });
    }

    // Save the updated user
    await user.save();

    // Create a new deposit record
    const newDeposit = await deposit.create({
      email: user.email,
      userid,
      amount: depositAmount, // Ensure the correct amount is stored
      account,
      accountNumber,
    });

    const mobileNumber = user.mobileNumber;
    const url = "https://kan-credit.vercel.app/sign-in";
    // Generate the verification message
    const message = `Hello ${email},\n\nYour account has been credited with GHS  ${amount}   by Kan Credit Union Bank. click here to confirm ${url}\nRegards,\nTeam`;
    await sendSMS(mobileNumber, message);

    res.json({
      status: "success",
      message: "Deposit processed successfully",
      newDeposit,
    });
  } catch (err) {
    console.error("Error during deposit processing: ", err);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
    });
  }
};

const verifyPayment = async (req, res) => {
  const { reference } = req.query;

  try {
    // Step 1: Verify the payment with Paystack
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
      // Step 2: Query the deposit based on the reference
      const existingDeposit = await deposit.findOne({ reference });

      if (!existingDeposit) {
        return res.status(404).json({
          status: "error",
          message: "Deposit not found",
        });
      }

      // Step 3: Update the deposit status to success
      existingDeposit.status = "success";
      existingDeposit.dateDeposited = new Date();
      await existingDeposit.save();

      // Step 4: Update the user's balance
      const accountNumber = existingDeposit.accountNumber;
      const depositAmount = existingDeposit.amount;

      const existingUser = await user.findOne({ accountNumber });

      if (!existingUser) {
        return res.status(404).json({
          status: "error",
          message: "User not found",
        });
      }

      existingUser.balance += depositAmount;
      await existingUser.save();

      // Step 5: Send success response
      res.json({
        status: "success",
        message: "Payment verified and deposit updated successfully",
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
  manualDeposit,
};
