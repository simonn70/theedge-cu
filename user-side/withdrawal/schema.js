const mongoose = require("mongoose");
const schema = mongoose.Schema;

const withdrawalSchema = new schema({
  account: {
    type: String,
    required: [true, "please select the account you want to withdraw from"],
  },
  amount: {
    type: Number,
    required: [true, "please enter the amount you'd like to withdraw"],
  },
  purpose: {
    type: String,
    required: true,
    default: `money withdrawal `,
  },
  accountNumber: {
    type: String,
    required: [false, "please enter your account number"],
  },

  status: {
    type: String,
    required: [false, "the status of your transaction"],
    default: "pending",
  },
  dateWithdrawn: {
    type: Date,
    required: [true, "please include the date of the withdrawal"],
    default: Date.now(),
  },
});

module.exports = mongoose.model("withdrawls", withdrawalSchema);
