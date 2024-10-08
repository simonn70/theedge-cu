const multer = require("multer");
const user = require("../user-side/users/schema");
const deposit = require("../user-side/deposit/schema");
const withdrawal = require("../user-side/withdrawal/schema");
const bcrypt = require("bcrypt");

const getHomepage = async (req, res) => {
  try {
    // Count the number of users
    const users = await user.countDocuments();

    // Count the number of successful deposits and withdrawals
    const deposits = await deposit.countDocuments({ status: "success" });
    const withdrawals = await withdrawal.countDocuments({ status: "success" });

    // Calculate the total amount of successful deposits and withdrawals
    let totalDeposits = 0;
    let totalWithdrawals = 0;

    const successfulDeposits = await deposit.find({ status: "success" });
    for (const eachDeposit of successfulDeposits) {
      totalDeposits += eachDeposit.amount;
    }

    const successfulWithdrawals = await withdrawal.find({ status: "success" });
    for (const eachWithdrawal of successfulWithdrawals) {
      totalWithdrawals += eachWithdrawal.amount;
    }

    // Send the response with the calculated values
    res.status(200).send({
      users,
      deposits,
      withdrawals,
      totalDeposits,
      totalWithdrawals,
    });
  } catch (err) {
    console.error("Error fetching homepage data:", err);
    res.status(500).send({ error: "Failed to fetch homepage data" });
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

const getCustomerReports = async (req, res) => {
  const { accountNumber } = req.query;
  try {
    // Fetch all withdrawals and deposits (considering all statuses)
    const allWithdrawals = await withdrawal.find({ accountNumber });
    const allDeposits = await deposit.find({ accountNumber });
    const user = await user.find({ accountNumber });

    // Fetch only successful withdrawals and deposits for total calculations
    const successfulWithdrawals = await withdrawal.find({
      accountNumber,
      status: "success",
    });
    const successfulDeposits = await deposit.find({
      accountNumber,
      status: "success",
    });

    // Combine all withdrawals and deposits into a single array
    const allTransactions = [...allWithdrawals, ...allDeposits];
    const allSuccessfulTransactions = [
      ...successfulWithdrawals,
      ...successfulDeposits,
    ];

    // Sort the combined transactions array by date (whether dateWithdrawn or dateDeposited)
    const sortedTransactions = allTransactions.sort((a, b) => {
      const dateA = a.dateWithdrawn || a.dateDeposited;
      const dateB = b.dateWithdrawn || b.dateDeposited;
      return new Date(dateA) - new Date(dateB);
    });
    const sortedSuccessfulTransactions = allSuccessfulTransactions.sort(
      (a, b) => {
        const dateA = a.dateWithdrawn || a.dateDeposited;
        const dateB = b.dateWithdrawn || b.dateDeposited;
        return new Date(dateA) - new Date(dateB);
      }
    );

    // Group transactions by account number and separate deposits/withdrawals for successful transactions
    const groupedTransactions = [
      ...successfulWithdrawals,
      ...successfulDeposits,
    ].reduce((acc, transaction) => {
      const { accountNumber, amount, account } = transaction;
      const isWithdrawal = successfulWithdrawals.some((w) =>
        w._id.equals(transaction._id)
      );

      if (!acc[account]) {
        acc[account] = {
          totalDeposits: 0,
          totalWithdrawals: 0,
        };
      }

      // Update total deposits or withdrawals
      if (isWithdrawal) {
        acc[account].totalWithdrawals += amount;
      } else {
        acc[account].totalDeposits += amount;
      }

      return acc;
    }, {});

    // Calculate net totals
    const totals = {};
    Object.keys(groupedTransactions).forEach((account) => {
      const { totalDeposits, totalWithdrawals } = groupedTransactions[account];
      totals[account] = totalDeposits - totalWithdrawals;
    });

    res.status(200).send({
      totals,
      allTransactions: sortedTransactions, // Return sorted transactions
      groupedTransactions: sortedSuccessfulTransactions,
      user
    });
  } catch (err) {
    console.error("Error fetching reports:", err);
    res.status(500).send({ error: "Internal Server Error" });
  }
};

// const getCustomerReports = async (req, res) => {
//   const { accountNumber } = req.query;
//   try {
//     const withdrawals = await withdrawal.find({ accountNumber });
//     const deposits = await deposit.find({ accountNumber });

//     // Merge deposits and withdrawals
//     const allTransactions = [...withdrawals, ...deposits];

//     // Group transactions by account number and separate deposits/withdrawals
//     const groupedTransactions = allTransactions.reduce((acc, transaction) => {
//       const { accountNumber, amount, account } = transaction;
//       const isWithdrawal = withdrawals.some((w) =>
//         w._id.equals(transaction._id)
//       );

//       if (!acc[account]) {
//         acc[account] = {
//           transactions: [],
//           totalDeposits: 0,
//           totalWithdrawals: 0,
//         };
//       }

//       acc[account].transactions.push({
//         amount,
//         account,
//         date: transaction.date,
//         _id: transaction._id,
//         type: isWithdrawal ? "withdrawal" : "deposit",
//       });

//       // Update total deposits or withdrawals
//       if (isWithdrawal) {
//         acc[account].totalWithdrawals += amount;
//       } else {
//         acc[account].totalDeposits += amount;
//       }

//       return acc;
//     }, {});

//     // Transform grouped transactions into separate totals and transactions arrays
//     const totals = {};
//     const transactions = {};

//     Object.keys(groupedTransactions).forEach((account) => {
//       const {
//         totalDeposits,
//         totalWithdrawals,
//         transactions: trans,
//       } = groupedTransactions[account];

//       // Calculate net total for the account
//       totals[account] = totalDeposits - totalWithdrawals;
//       transactions[account] = trans;
//     });

//     res.status(200).send({
//       totals,
//       allTransactions,
//     });
//   } catch (err) {
//     console.error("Error fetching reports:", err);
//     res.status(500).send({ error: "Internal Server Error" });
//   }
// };

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
