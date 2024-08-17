const axios = require("axios");
const Withdrawal = require("./schema");
const User = require("../users/schema");
const paystack = require("paystack-api")(
  "Bearer sk_test_3b0262988db07d1c10731c8e353e1ad5b99d29ed"
); // Ensure to use your Paystack secret key

const getWithdrawalPage = (req, res) => {
  res.send("This is the withdrawal page");
};
const PAYSTACK_SECRET_KEY = "sk_test_fcc05416469bb4e211d4f89d6870b5328dc847dc";

const makeWithdrawal = async (req, res) => {
  const { amount, accountNumber, purpose, account } = req.body;
  try {
    // const response = await paystack.transaction.initialize({
    //   amount: amount * 100, // Convert amount to kobo
    //   email,
    // });
    //tag pending
    const newWithdrawal = await Withdrawal.create({
      account,
      amount,
      purpose,
      accountNumber,
      // Add reference to the withdrawal record
    });

    res.status(200).json({
      newWithdrawal,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error." });
  }
};

const createRecipientAndTransfer = async (req, res) => {
  const { accountNumber, bank_code, amount, type, currency, reason } = req.body;
  try {
    //query fr the user
    const user = await User.findOne({ accountNumber });
    console.log(user);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // Step 1: Create the Transfer Recipient
    const recipientResponse = await axios.post(
      "https://api.paystack.co/transferrecipient",
      {
        type: "mobile_money", // Set the type to 'mobile_money'
        name: user.name,
        // Use the appropriate currency code, e.g., "GHS" for Ghana
        bank_code: "MTN", // Set the mobile money provider's bank code, e.g., "MTN" for MTN Mobile Money
        // Use the mobile money number here
        account_number: user.mobileNumber,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const recipientCode = recipientResponse.data.data.recipient_code;

    // Step 2: Initiate the Transfer
    const transferResponse = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount,
        recipient: recipientCode,
        reason,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const transferId = transferResponse.data.data.id;

    // Step 3: Verify the Transfer
    const verifyTransferResponse = await axios.get(
      `https://api.paystack.co/transfer/${transferId}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const transferStatus = verifyTransferResponse.data.data.status;

    if (transferStatus === "success") {
      //update the withdrawal to success
      // Send the combined response
      res.status(201).json({
        status: "success",
        message: "Recipient created and transfer initiated successfully",
        recipient: recipientResponse.data.data,
        transfer: transferResponse.data.data,
        verification: verifyTransferResponse.data.data,
      });
    } else {
      // Handle cases where the transfer is not successful
      res.status(400).json({
        status: "error",
        message:
          "Transfer failed or is pending. Please check the transfer status.",
        recipient: recipientResponse.data.data,
        transfer: transferResponse.data.data,
        verification: verifyTransferResponse.data.data,
      });
    }
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.response ? error.response.data.message : error.message,
    });
  }
};

const rejectWithdrawal = async (req, res) => {
  const { id } = req.body;

  try {
    // Find the withdrawal by ID and update its status to "rejected"
    const updatedWithdrawal = await Withdrawal.findByIdAndUpdate(
    id,
      { status: "rejected" },
      { new: true }
    );

    if (!updatedWithdrawal) {
      return res.status(404).json({
        status: "error",
        message: "Withdrawal not found",
      });
    }

    res.status(200).json({ 
      status: "success",
      message: "Withdrawal rejected successfully",
      withdrawal: updatedWithdrawal,
    });
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error.response ? error.response.data.message : error.message,
    });
  }
};
module.exports = {
  getWithdrawalPage,
  makeWithdrawal,
  rejectWithdrawal,
  createRecipientAndTransfer,
};

//withdraw and based on the account it should dedact from the balance of the account

// const axios = require("axios");
// const { PAYSTACK_SECRET_KEY } = require("../config/config");

// Create Transfer Recipient and Initiate Transfer
