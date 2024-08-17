const express = require("express");
const mongoose = require("mongoose");
const cookierParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const userRoutes = require("./user-side/users/routes");
const ussdRoutes = require("./user-side/ussd/route");
const depositRoutes = require("./user-side/deposit/routes");
const withdrawalRoutes = require("./user-side/withdrawal/routes");
const userReportRoutes = require("./user-side/reports");
const adminRoutes = require("./admin/homepage");
const bankRoutes = require("./admin/bank/routes");

const app = express();
app.use(express.json());
app.use(cors());
app.use("/users", userRoutes);
app.use("/customers", ussdRoutes);
app.use("/deposit", depositRoutes);
app.use("/withdrawal", withdrawalRoutes);
app.use("/reports", userReportRoutes);
app.use("/admin", adminRoutes);
app.use("/bank", bankRoutes);

mongoose
  .connect(process.env.MONGODB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("connected to db"))
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("server is up and running");
    });
  })
  .catch((err) => console.log(err));
