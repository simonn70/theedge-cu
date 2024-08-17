const Account = require("./schema");

// Controller function to add a savings account
const addSavingsAccount = async (req, res) => {
  const { balance } = req.body;

  if (balance === undefined) {
    return res.status(400).json({ message: "Balance is required" });
  }

  try {
    const newAccount = new Account({
      accountType: "savings",
      balance,
    });

    await newAccount.save();

    res.status(201).json({
      message: "Savings account created successfully",
      account: newAccount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Controller function to add an investments account
const addInvestmentsAccount = async (req, res) => {
  const { balance } = req.body;

  if (balance === undefined) {
    return res.status(400).json({ message: "Balance is required" });
  }

  try {
    const newAccount = new Account({
      accountType: "investments",
      balance,
    });

    await newAccount.save();

    res.status(201).json({
      message: "Investments account created successfully",
      account: newAccount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = {
  addSavingsAccount,
  addInvestmentsAccount,
};
