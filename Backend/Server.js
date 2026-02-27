const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();
connectDB();

app.use(cors());
app.use(express.json());

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/budget", require("./routes/budgetRoutes"));
app.use("/api/expense", require("./routes/expenseRoutes"));
app.use("/api/investment", require("./routes/investmentRoutes"));
app.use("/api/occasion", require("./routes/occasionRoutes"));
app.use("/api/budgetmaker", require("./routes/budgetMakerRoutes"));

app.listen(5000, () => console.log("Server Running on Port 5000"));
require("dotenv").config();
app.use("/api/auth", require("./routes/authRoutes"));

