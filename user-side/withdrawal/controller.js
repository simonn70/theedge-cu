const axios = require("axios");
const Withdrawal = require("./schema");
const User = require("../users/schema");
const { sendSMS } = require("../../utils/sendSMS");

const getWithdrawalPage = (req, res) => {
  res.send("This is the withdrawal page");
};
const PAYSTACK_SECRET_KEY = "sk_live_b656166f9c8b4216425d78a0ef4c49a390d84cbd";

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

const manualWithdrawal = async (req, res) => {
  const { amount, accountNumber, purpose, account } = req.body;

  try {
    // Find the user by account number
    const user = await User.findOne({ accountNumber });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure that the amount is treated as a number
    const withdrawalAmount = parseFloat(amount);

    // Update the user's balance based on the account type
    if (account === "shares") {
      user.sharesBalance -= withdrawalAmount;
    } else if (account === "savings") {
      user.savingsBalance -= withdrawalAmount;
    } else {
      return res.status(400).json({ message: "Invalid account type" });
    }

    // Save the updated user
    await user.save();

    // Create a new withdrawal record
    const newWithdrawal = await Withdrawal.create({
      account,
      amount: withdrawalAmount, // Ensure the correct amount is stored
      purpose,
      accountNumber,
     
      status: "success",
    });
    const mobileNumber = user.mobileNumber;
    const url = "https://www.mycitticreditonline.com";
    // Generate the verification message
    const message = `Hello ${user.email},\n\nYour account has been debited with GHS  ${withdrawalAmount}   by Citti Credit Union Bank. click here to confirm ${url}\nRegards,\nTeam`;
    await sendSMS(mobileNumber, message);

    res.status(200).json({
      newWithdrawal,
      message: "Withdrawal processed successfully",
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
        currency: "GHS",
        account_number: user.mobileNumber,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(recipientResponse);

    const recipientCode = recipientResponse.data.data.recipient_code;
    console.log(recipientCode);
    

    // Step 2: Initiate the Transfer
    const transferResponse = await axios.post(
      "https://api.paystack.co/transfer",
      {
        source: "balance",
        amount:1000,
        recipient: recipientCode,
        
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(transferResponse);
    

    const transferId = transferResponse.data.data.id;

    // Step 3: Verify the Transfer
  
    if (transferId) {
      //update the withdrawal to success
      // Send the combined response
      res.status(201).json({
        status: "success",
        message: "Recipient created and transfer initiated successfully",
        recipient: recipientResponse.data.data,
        transfer: transferResponse.data.data,
       
      });
    } else {
      // Handle cases where the transfer is not successful
      res.status(400).json({
        status: "error",
        message:
          "Transfer failed or is pending. Please check the transfer status.",
        recipient: recipientResponse.data.data,
        transfer: transferResponse.data.data,
        
      });
    }
  } catch (error) {
    res.status(400).json({
      status: "error",
      message: error
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
  manualWithdrawal,
  rejectWithdrawal,
  createRecipientAndTransfer,
};

//withdraw and based on the account it should dedact from the balance of the account

// const axios = require("axios");
// const { PAYSTACK_SECRET_KEY } = require("../config/config");

// Create Transfer Recipient and Initiate Transfer
