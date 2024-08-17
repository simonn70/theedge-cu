const multer = require("multer");
const user = require("../user-side/users/schema");
const deposit = require("../user-side/deposit/schema");
const withdrawal = require("../user-side/withdrawal/schema");
const bcrypt = require("bcrypt");

const getHomepage = async (req, res) => {
  try {
    const users = await user.countDocuments();
    const deposits = await deposit.countDocuments();
    const withdrawals = await withdrawal.countDocuments();
    let totalDeposits = 0;
    let totalWithdrawals = 0;
    for (const eachdeposit of await deposit.find()) {
      totalDeposits += eachdeposit.amount;
    }
    for (const eachwithdrawal of await withdrawal.find()) {
      totalWithdrawals += eachwithdrawal.amount;
    }
    res.status(200).send({
      users,
      deposits,
      withdrawals,
      totalDeposits,
      totalWithdrawals,
    });
  } catch (err) {
    throw err;
  }
};

const getMembers = async (req, res) => {
  try {
    const users = await user.find();
    if (!users) {
      res.status(404).send("you have no members in your database");
    }
    res.status(200).send(users);
  } catch (err) {
    throw err;
  }
};

const newMember = async (req, res) => {
  const { name, account, accountNumber, email, password } = req.body;
  try {
    const existingUser = await user.findOne({ email });
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      const newUser = await user.create({
        name,
        email,
        password: hashedPassword,
        account,
        selectedBank,
        accountNumber,
      });
      if (newUser) {
        res.status(201).send(newUser);
      } else {
        res
          .status(400)
          .send("error encountered while creating user. please try again");
      }
    }
  } catch (err) {
    throw err;
  }
};

const insertMembers = async (req, res) => {
  try {
    const file = req.body;
    let newUsers = {};

    for (const row of file) {
      const newUser = await user.create({
        email: row.email,
        password: row.password,
        mobileNumber: row.mobileNumber,
        balance: row.balance,
        accountNumber: row.accountNumber,
      });

      if (!newUser) {
        continue;
      }
      newUsers[newUser._id] = newUser;
    }

    res.status(201).json(newUsers);
  } catch (err) {
    res.status(500).json({ error: "Failed to insert members" });
  }
};


const updateMember = async (req, res) => {
  const { id, email } = req.body;
  try {
    const existingUser = await user.findOne({ id });
    if (!existingUser) {
      res.status(404).send("no such user exists. check your credentials");
    } else {
      existingUser.email = email || existingUser.email;
      if (req.body.password) {
        const salt = await bcrypt.genSalt(10);
        const newPassword = await bcrypt.hash(req.body.password, salt);
        existingUser.password = newPassword || existingUser.password;
      }
      res.send(existingUser);
    }
  } catch (err) {
    throw err;
  }
};

const getPendingWithdrawals = async (req, res) => {
  try {
    const pendingWithdrawals = await withdrawal.find({ status: "pending" });

    if (!pendingWithdrawals || pendingWithdrawals.length === 0) {
      return res.status(404).send("There are no pending withdrawals");
    }

    res.status(200).json(pendingWithdrawals);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};


const updateWithdrawal = async (req, res) => {
  const { transactionid } = req.body;
  try {
    const existingWithdrawal = await withdrawal.find({ transactionid });
    if (!existingWithdrawal) {
      res.status(404).send("no such transaction exists");
    } else {
      existingWithdrawal.updateOne(
        {
          _id: existingWithdrawal._id,
        },
        {
          $set: {
            status: "approved",
          },
        }
      );
    }
  } catch (err) {
    throw err;
  }
};

const getReports = async (req, res) => {
  try {
    const withdrawals = await withdrawal.find();
    const deposits = await deposit.find();
    res.status(200).send({
      withdrawals,
      deposits,
    });
  } catch (err) {
    throw err;
  }
};

const getUserReports = async (req, res) => {
  try {
    const accountNumber = req.params.accountNumber;

    // Fetch withdrawals and deposits
    const withdrawals = await withdrawal.find({ accountNumber });
    const deposits = await deposit.find({ accountNumber });

    // Merge transactions
    const transactions = [...withdrawals, ...deposits];

    // Group and calculate totals
    const totals = transactions.reduce((acc, transaction) => {
      const accountType = transaction.accountType; // Assuming accountType is a field in your transactions

      if (!acc[accountType]) {
        acc[accountType] = { total: 0, transactions: [] };
      }

      acc[accountType].total += transaction.amount; // Assuming amount is a field in your transactions
      acc[accountType].transactions.push(transaction);

      return acc;
    }, {});

    res.status(200).send(totals);
  } catch (err) {
    res.status(500).send({ error: err.message });
  }
};

const getCustomerReports = async (req, res) => {
  const { accountNumber } = req.query;
  try {
    const withdrawals = await withdrawal.find({ accountNumber });
    const deposits = await deposit.find({ accountNumber });

    // Merge deposits and withdrawals
    const allTransactions = [...withdrawals, ...deposits];

    // Group transactions by account number
    const groupedTransactions = allTransactions.reduce((acc, transaction) => {
      const { accountNumber, amount, account } = transaction;

      if (!acc[account]) {
        acc[account] = {
          transactions: [],
          total: 0,
        };
      }
      acc[account].transactions.push({
        amount,
        account,
        date: transaction.date,
        _id: transaction._id,
      });

      // Update total
      acc[account].total += amount;
      return acc;
    }, {});

    // Transform grouped transactions into separate totals and transactions arrays
    const totals = {};
    const transactions = {};

    Object.keys(groupedTransactions).forEach((account) => {
      const { total, transactions: trans } = groupedTransactions[account];

      // Initialize totals and transactions arrays
      totals[account] = total;
      transactions[account] = trans;
    });

    res.status(200).send({
      totals,
      allTransactions,
    });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

module.exports = {
  getHomepage,
  getMembers,
  newMember,
  getPendingWithdrawals,
  getReports,
  updateMember,
  updateWithdrawal,
  insertMembers,
  getCustomerReports,
};
