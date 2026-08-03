require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ── Only these for now ────────────────────────────────────────────
app.use("/api/auth",         require("./routes/authRoutes"));
app.use("/api/budget-maker", require("./routes/budgetMakerRoutes"));
app.use("/api/expenses",     require("./routes/expenseRoutes"));
app.use("/api/ocr",          require("./routes/ocrRoutes")); 
app.use("/api/investments",  require("./routes/investmentRoutes"));
app.use("/api/occasions", require("./routes/occasionRoutes"));

// ── Comment these out until their controllers are ready ───────────
// app.use("/api/budget",       require("./routes/budgetRoutes"));
// app.use("/api/investments",  require("./routes/investmentRoutes"));
// app.use("/api/occasions",    require("./routes/occasionRoutes"));

app.get("/", (req, res) => res.json({ status: "WE-Budget API running ✅" }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));