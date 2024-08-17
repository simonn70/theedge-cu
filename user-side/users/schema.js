const mongoose = require("mongoose");
const schema = mongoose.Schema;

const userSchema = new schema({
  name: {
    type: String,
    required: [false, "your userid is required"],
  },
  email: {
    type: String,
    required: [false, "your email is required"],
  },
  password: {
    type: String,
    required: [false, "your password is required"],
  },
  mobileNumber: {
    type: String,
    required: [false, "your number is required"],
  },
  selectedBank: {
    type: String,
    required: [false, "please select your bank"],
  },
  accountNumber: {
    type: String,
    required: [false, "please enter your account number"],
  },
  balance: {
    type: Number,
    default: 0, // Set default value of 0 for balance
    required: [false, "please enter your balance"],
  },
  banks: {
    type: [schema.Types.ObjectId],
    ref: "Bank",
  },
  userType: {
    type: String,
  },
  accounts: [
    {
      type: [schema.Types.ObjectId],
      ref: "Account",
    },
  ],
});

module.exports = mongoose.model("User", userSchema);
