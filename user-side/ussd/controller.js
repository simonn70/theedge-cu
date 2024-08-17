const axios = require("axios");
const Withdrawal = require("../withdrawal/schema"); // Assuming a Withdrawal model is defined
const Deposit = require("../deposit/schema"); // Assuming a Deposit model is defined
const PAYSTACK_SECRET_KEY = "sk_test_fcc05416469bb4e211d4f89d6870b5328dc847dc";

// Networks configuration (example)
const NETWORKS = {
  MTN: {
    apiUrl: "https://mtn-api.example.com",
    apiKey: "mtn_api_key",
    prefixes: ["054", "055"], // Example prefixes for MTN
    provider: "mtn",
  },
  AIRTELTIGO: {
    apiUrl: "https://airtel-api.example.com",
    apiKey: "airtel_api_key",
    prefixes: ["020", "021"], // Example prefixes for AirtelTigo
    provider: "airtel",
  },
  VODAFONE: {
    apiUrl: "https://vodafone-api.example.com",
    apiKey: "vodafone_api_key",
    prefixes: ["027", "028"], // Example prefixes for Vodafone
    provider: "vodafone",
  },
};

// Function to charge with Paystack
async function chargeWithPaystack(phone, accountNumber, amount, network) {
  console.log(phone, amount);

  try {
    const response = await axios.post(
      "https://api.paystack.co/charge",
      {
        amount: amount * 100, // Convert to the lowest currency unit
        email: "simonadjei70@gmail.com", // Example email
        currency: "GHS",
        mobile_money: {
          phone: phone, // Use the provided phone number
          provider: network.provider, // Use the provider from the network object
        },
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(response.data);

    return response.data;
  } catch (error) {
    console.error("Error charging with Paystack:", error.message);
    throw error;
  }
}

// Function to check balance
async function checkBalance(accountNumber) {
  return 500.0; // Example balance value, replace with real balance retrieval logic
}

// Function to verify account number
async function verifyAccountNumber(accountNumber) {
  const validAccountNumbers = ["1234567890", "0987654321"]; // Example account numbers
  return validAccountNumbers.includes(accountNumber);
}

let sessionData = {};

// USSD handler function
async function ussdHandler(req, res) {
  const { userData, sessionID, userID, msisdn, network } = req.body;
  let message = "";
  let continueSession = false;

  // Validate network
  if (!network) {
    message = "Network not supported. Please contact support.";
  } else if (!sessionData[sessionID]?.accountNumber) {
    // Handle initial account number input
    if (!userData || userData === "*928*443#") {
      message = "Welcome to MyCittiCredit Union\nPlease enter your account number:";
      continueSession = true;
    } else if (userData.length === 10 && !isNaN(userData)) {
      const accountNumber = userData;
      const isValidAccount = await verifyAccountNumber(accountNumber);
      if (isValidAccount) {
        sessionData[sessionID] = { accountNumber };
        message = "What would you like to do?\n1. Deposit\n2. Withdraw\n3. Check Balance\n4. Exit";
        continueSession = true;
      } else {
        message = "Invalid account number. Please try again.";
        continueSession = true;
      }
    } else {
      message = "Invalid input. Please enter a valid account number.";
      continueSession = true;
    }
  } else {
    // Handle user actions after account number is entered
    const userInput = userData.trim();
    const session = sessionData[sessionID];
    const accountNumber = session.accountNumber;

    if (!session.selectedAction && (userInput === "3" || userInput === "4")) {
      if (userInput === "3") {
        const balance = await checkBalance(accountNumber);
        message = `Your current balance is GHS ${balance}.`;
      } else if (userInput === "4") {
        message = "Thank you for using the USSD Service.";
        delete sessionData[sessionID];
      }
    } else if (!session.selectedAction && (userInput === "1" || userInput === "2")) {
      session.selectedAction = userInput;
      message = `Which account do you want to ${
        userInput === "1" ? "deposit into" : "withdraw from"
      }?\n1. Citti Savings\n2. Citti Investment`;
      continueSession = true;
    } else if (!session.selectedAccount && (userInput === "1" || userInput === "2")) {
      session.selectedAccount = userInput === "1" ? "Citti Savings" : "Citti Investment";
      message = `Enter Amount for ${
        session.selectedAction === "1" ? "Deposit" : "Withdrawal"
      }:`;
      continueSession = true;
    } else if (session.selectedAction === "2") {
      // Handle withdrawal
      if (!session.amount) {
        session.amount = Number(userInput);
        if (isNaN(session.amount) || session.amount <= 0) {
          message = "Invalid input. Please enter a valid amount.";
          continueSession = true;
        } else {
          message = "Enter the purpose of withdrawal:";
          continueSession = true;
        }
      } else if (!session.purpose) {
        session.purpose = userInput;

        try {
          // Save withdrawal to DB
          const newWithdrawal = new Withdrawal({
            accountNumber: accountNumber,
            account: session.selectedAccount,
            amount: session.amount,
            purpose: session.purpose,
            status: "pending",
          });
          await newWithdrawal.save();
          message = `Your withdrawal of GHS ${session.amount} for '${session.purpose}' has been initiated.`;
          delete sessionData[sessionID]; // Clear session data
        } catch (error) {
          message = "There was an issue initiating your withdrawal. Please try again.";
          continueSession = true; // Retry
        }
      }
    } else if (session.selectedAction === "1") {
      // Handle deposit
      if (!isNaN(userInput) && Number(userInput) > 0) {
        session.amount = Number(userInput);
        try {
          const chargeResult = await chargeWithPaystack(msisdn, accountNumber, session.amount, NETWORKS[network]);

          // Save deposit to DB
          const newDeposit = new Deposit({
            accountNumber: accountNumber,
            account: session.selectedAccount,
            amount: session.amount,
            status: chargeResult.status === "success" ? "success" : "rejected",
          });
          await newDeposit.save();

          message =
            chargeResult.status === "success"
              ? `Your deposit of GHS ${session.amount} was successful.`
              : "Deposit failed. Please try again.";
        } catch (error) {
          message = "There was an issue with your deposit. Please try again.";
        }
      } else {
        message = "Invalid input. Please enter a valid amount.";
        continueSession = true;
      }
    } else {
      message = "Invalid input. Please try again.";
      continueSession = true;
    }
  }

  res.json({
    sessionID,
    userID,
    msisdn,
    message,
    continueSession,
  });
}

module.exports = {
  ussdHandler,
};
