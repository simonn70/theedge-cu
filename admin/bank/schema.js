const mongoose = require("mongoose");
const schema = mongoose.Schema;

const bankSchema = new schema({
  name: {
    type: String,
    required: [true, "The bank name is required"],
  },
  email: {
    type: String,
    required: [true, "Your email is required"],
  },
  password: {
    type: String,
    required: [true, "Your password is required for account creation"],
  },
  phoneNumber: {
    type: String,
    required: [true, "Your official phone number is required"],
  },
  address: {
    type: String,
    required: [true, "Your headquarters address is required"],
  },
  bankPermit: {
    type: String,
  },
  userType: {
    type: String,
  },
  users: {
    type: [schema.Types.ObjectId],
    ref: "User",
  },
});

module.exports = mongoose.model("Bank", bankSchema);
