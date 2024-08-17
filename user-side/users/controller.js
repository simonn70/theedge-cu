const bcrypt = require("bcrypt");
const { createToken, maxAge } = require("../../utils/authN");
const User = require("./schema"); // Adjust the path to your schema file
const Bank = require("../../admin/bank/schema");
const { sendSMS } = require("../../utils/sendSMS.js");

const getUserLogin = (req, res) => {
  res.send("Login get page");
};

const postUserLogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    // Try to find the user or bank by email
    const existingUser = await User.findOne(
      { email } || { mobileNumber: email }
    );
    const existingBank = await Bank.findOne({ email });

    // Check if neither a user nor a bank exists with the provided email
    if (!existingUser && !existingBank) {
      return res.status(404).json({
        message:
          "Invalid credentials. Please try again with the right credentials.",
      });
    }

    // Determine whether the found account is a user or a bank
    const account = existingUser || existingBank;

    // Compare the provided password with the stored password
    const passwordMatch = await bcrypt.compare(password, account.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: "Invalid password." });
    }

    // Create a token for the authenticated user/bank
    const token = createToken(account._id);

    // Respond with the token and account type information
    return res.status(200).json({
      token,
      accountType: existingUser ? "customer" : "bank",
      account,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

const getUserSignUp = (req, res) => {
  res.send("Sign up get page");
};

const postUserSignUp = async (req, res) => {
  const {
    name,
    email,
    password,
    mobileNumber,
    selectedBank,
    accountNumber,
    balance,
  } = req.body;
  try {
    const existingUser = await User.findOne({ email } || { accountNumber });
    if (existingUser) {
      return res.status(400).json({ message: "This user already exists." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      selectedBank,
      accountNumber,
      mobileNumber,
      balance,
      userType: "newMember",
    });

    // generate verification code for verification
    const message = `Hello ${email},\n\nYour account with acc number: ${accountNumber} has been created by Citti Credit Union Bank. Your credentials are as follows:\n\nEmail: ${email}\nPassword: ${password}\n\nPlease change your password after your first login\n .\n\nRegards,\nTeam`;

    if (newUser) {
      //trigger a mail or notification with a good message
      await sendSMS(mobileNumber, message);

      return res.status(201).json(newUser);
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error." });
  }
};

// reset details

// Controller function to reset password and set the name field
const resetPasswordAndSetName = async (req, res) => {
  const { userId, password, name } = req.body;

  try {
    // Validate input
    if (!userId || !password || !name) {
      return res
        .status(400)
        .json({ message: "User ID, new password, and new name are required." });
    }

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password and name
    user.password = hashedPassword;
    user.name = name;
    user.userType = "customer";

    // Save the updated user
    await user.save();

    // Return success response
    res
      .status(200)
      .json({ message: "Password and name updated successfully.", user });
  } catch (error) {
    // Handle any errors
    console.error(error);
    res.status(500).json({
      message: "An error occurred while updating the password and name.",
    });
  }
};

module.exports = {
  getUserLogin,
  postUserLogin,
  getUserSignUp,
  postUserSignUp,
  resetPasswordAndSetName,
};
