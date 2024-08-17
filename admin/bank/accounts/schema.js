const mongoose = require("mongoose");
const schema = mongoose.Schema;

const accountSchema = new schema({
  accountType: {
    type: String,
    required: [true, "Account type is required"],
  },
  balance: {
    type: Number,
    required: [true, "Balance is required"],
  },
});

module.exports = mongoose.model("Account", accountSchema);
