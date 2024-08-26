const axios = require("axios");
const Withdrawal = require("../withdrawal/schema");
const Deposit = require("../deposit/schema");
const User = require("../users/schema");
const PAYSTACK_SECRET_KEY = "sk_test_fcc05416469bb4e211d4f89d6870b5328dc847dc";

const NETWORKS = {
  MTN: {
    apiUrl: "https://mtn-api.example.com",
    apiKey: "mtn_api_key",
    prefixes: ["054", "055"],
    provider: "mtn",
  },
  AIRTELTIGO: {
    apiUrl: "https://airtel-api.example.com",
    apiKey: "airtel_api_key",
    prefixes: ["020", "021"],
    provider: "airtel",
  },
  VODAFONE: {
    apiUrl: "https://vodafone-api.example.com",
    apiKey: "vodafone_api_key",
    prefixes: ["027", "028"],
    provider: "vodafone",
  },
};

const ACCOUNT_TYPE_MAP = {
  "Citti Shares": "shares",
  "Citti Savings": "savings",
  "Citti Investment": "investment",
};

async function chargeWithPaystack(phone, accountNumber, amount, network) {
  console.log(phone, amount);
  const value = parseFloat(amount);

  try {
    const response = await axios.post(
      "https://api.paystack.co/charge",
      {
        amount: value,
        email: `simonadjei70@gmail.com`,
        currency: "GHS",
        mobile_money: {
          phone: "0551234987",
          provider: "mtn",
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

    return response.data.data;
  } catch (error) {
    console.error(
      "Error charging with Paystack:",
      error.response ? error.response.data : error.message
    );

    throw error;
  }
}

async function checkBalance(accountNumber, selectedAccount) {
  const user = await User.findOne({ accountNumber });

  if (!user) {
    throw new Error("Account not found");
  }

  const accountType = ACCOUNT_TYPE_MAP[selectedAccount];
  let balance;
  if (accountType === "shares") {
    balance = user.sharesBalance;
  } else if (accountType === "savings") {
    balance = user.savingsBalance;
  }

  return balance;
}

async function verifyAccountNumber(accountNumber) {
  const user = await User.findOne({ accountNumber });
  return !!user;
}

let sessionData = {};

async function ussdHandler(req, res) {
  const { userData, sessionID, userID, msisdn, network } = req.body;
  let message = "";
  let continueSession = false;

  if (!network) {
    message = "Network not supported. Please contact support.";
  } else if (!sessionData[sessionID]?.accountNumber) {
    if (!userData || userData === "*928*443#") {
      message =
        "Welcome to MyCittiCredit Union\nPlease enter your account number:";
      continueSession = true;
    } else if (userData.length === 10 && !isNaN(userData)) {
      const accountNumber = userData;
      const isValidAccount = await verifyAccountNumber(accountNumber);
      if (isValidAccount) {
        sessionData[sessionID] = { accountNumber };
        message =
          "What would you like to do?\n1. Deposit\n2. Withdraw\n3. Check Balance\n4. Exit";
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
    const userInput = userData.trim();
    const session = sessionData[sessionID];
    const accountNumber = session.accountNumber;

    if (!session.selectedAction && (userInput === "3" || userInput === "4")) {
      if (userInput === "3") {
        message =
          "Which account balance do you want to check?\n1. Citti Shares\n2. Citti Savings";
        session.selectedAction = "checkBalance";
        continueSession = true;
      } else if (userInput === "4") {
        message = "Thank you for using the USSD Service.";
        delete sessionData[sessionID];
      }
    } else if (
      session.selectedAction === "checkBalance" &&
      (userInput === "1" || userInput === "2")
    ) {
      session.selectedAccount =
        userInput === "1" ? "Citti Shares" : "Citti Savings";
      const accountType = ACCOUNT_TYPE_MAP[session.selectedAccount];
      try {
        const balance = await checkBalance(
          accountNumber,
          session.selectedAccount
        );
        message = `Your ${session.selectedAccount} balance is GHS ${balance}.`;
        delete sessionData[sessionID];
      } catch (error) {
        message = "There was an issue fetching your balance. Please try again.";
        continueSession = true;
      }
    } else if (
      !session.selectedAction &&
      (userInput === "1" || userInput === "2")
    ) {
      session.selectedAction = userInput;
      message = `Which account do you want to ${
        userInput === "1" ? "deposit into" : "withdraw from"
      }?\n1. Citti Savings\n2. Citti Investment`;
      continueSession = true;
    } else if (
      !session.selectedAccount &&
      (userInput === "1" || userInput === "2")
    ) {
      session.selectedAccount =
        userInput === "1" ? "Citti Savings" : "Citti Investment";
      message = `Enter Amount for ${
        session.selectedAction === "1" ? "Deposit" : "Withdrawal"
      }:`;
      continueSession = true;
    } else if (session.selectedAction === "2") {
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

        // Process withdrawal
        try {
          const newWithdrawal = new Withdrawal({
            accountNumber: accountNumber,
            account: ACCOUNT_TYPE_MAP[session.selectedAccount],
            amount: session.amount,
            purpose: session.purpose,
            status: "pending",
          });
          await newWithdrawal.save();
          message = `Your withdrawal of GHS ${session.amount} for '${session.purpose}' has been initiated.`;
          delete sessionData[sessionID];
        } catch (error) {
          message =
            "There was an issue initiating your withdrawal. Please try again.";
          continueSession = true;
        }
      }
    } else if (session.selectedAction === "1") {
      if (!isNaN(userInput) && Number(userInput) > 0) {
        session.amount = Number(userInput);
        try {
          const chargeResult = await chargeWithPaystack(
            msisdn,
            accountNumber,
            session.amount,
            network
          );

          // Save deposit to DB
          const newDeposit = new Deposit({
            accountNumber: accountNumber,
            account: ACCOUNT_TYPE_MAP[session.selectedAccount],
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
