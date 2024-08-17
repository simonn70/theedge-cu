const bank = require("./schema");
const bcrypt = require("bcrypt");

const { createToken, maxAge } = require("../../utils/authN");
require("dotenv").config();

// Mu

const getBankLoginPage = (req, res) => {
  res.status(200).send("Get bank login page");
};

const postBankLoginPage = async (req, res) => {
  const { email, password } = req.body;
  try {
    const existingBank = await bank.findOne({ email });
    if (!existingBank) {
      res
        .status(404)
        .send(
          "Invalid credentials. Please try again with the right credentials."
        );
    } else {
      const passwordMatch = await bcrypt.compare(
        password,
        existingBank.password
      );
      if (!passwordMatch) {
        res.status(401).send("Invalid password.");
      } else {
        const token = createToken(existingBank._id);
        res.cookie("bankjwt", token, {
          httpOnly: true,
          maxAge: maxAge * 1000,
        });
        res.status(200).json({ token, existingBank });
      }
    }
  } catch (err) {
    res.status(500).send("Internal server error.");
  }
};

const getBankSignupPage = (req, res) => {
  res.status(200).send("Get bank sign up page");
};

const postBankSignupPage = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phoneNumber,
      address,
      bankPermit,
      userType,
    } = req.body;

    // Check if the email or name already exists
    const existingBankByEmail = await bank.findOne({ email });
    if (existingBankByEmail) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingBankByName = await bank.findOne({ name });
    if (existingBankByName) {
      return res.status(400).json({ message: "Bank name already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    // Create new bank record
    const newBank = new bank({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      address,
      bankPermit,
      userType,
    });

    // Save the new bank record
    await newBank.save();

    res.status(201).json({ message: "Bank signed up successfully", newBank });
  } catch (error) {
    console.error("Error signing up bank:", error);
    if (error.name === "ValidationError") {
      // Handle validation errors
      res
        .status(400)
        .json({ message: "Validation error", errors: error.errors });
    } else {
      // Handle other errors
      res.status(500).json({ message: "Internal server error", error });
    }
  }
};

module.exports = postBankSignupPage;

module.exports = {
  getBankLoginPage,
  postBankLoginPage,
  getBankSignupPage,
  postBankSignupPage,
};
