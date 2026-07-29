const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    budgetPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BudgetPlan",
      required: true,
    },

    // ── Core fields ───────────────────────────────────────────────
    amount: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: [
        "Housing",
        "Transport",
        "Food",
        "Health",
        "Savings",
        "Investments",
        "Entertainment",
        "Misc",
      ],
    },
    description: { type: String, trim: true, maxlength: 200 },
    date: { type: Date, default: Date.now },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },

    // ── Receipt scan metadata ──────────────────────────────────────
    source: {
      type: String,
      enum: ["manual", "scan"],
      default: "manual",
    },
    receipt: {
      imageUri: { type: String },
      rawText: { type: String },       // OCR extracted text
      vendor: { type: String },        // e.g. "Swiggy", "BPCL"
      confidence: { type: Number },    // 0-1 OCR confidence score
    },

    // ── Notification flags ─────────────────────────────────────────
    notified80: { type: Boolean, default: false },
    notified100: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fast monthly queries
ExpenseSchema.index({ user: 1, month: 1, year: 1 });
ExpenseSchema.index({ user: 1, category: 1, month: 1, year: 1 });

module.exports = mongoose.model("Expense", ExpenseSchema);