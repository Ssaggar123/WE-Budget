const mongoose = require("mongoose");

const BudgetPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ── Income ────────────────────────────────────────────────────
    income: {
      salary: { type: Number, required: true, min: 0 },
      otherIncome: { type: Number, default: 0, min: 0 },
      totalIncome: { type: Number, required: true, min: 0 },
    },

    // ── Expense categories ────────────────────────────────────────
    housing: {
      rent: { type: Number, default: 0 },
      utilities: { type: Number, default: 0 },
      emi: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    transport: {
      fuelTransport: { type: Number, default: 0 },
      vehicleEmi: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    food: {
      groceries: { type: Number, default: 0 },
      diningOut: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    health: {
      healthInsurance: { type: Number, default: 0 },
      medicalExpenses: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    savings: {
      savingsPct: { type: Number, default: 20, min: 0, max: 100 },
      savingsAmount: { type: Number, default: 0 },
    },

    investments: {
      investmentPct: { type: Number, default: 10, min: 0, max: 100 },
      investmentAmount: { type: Number, default: 0 },
    },

    entertainment: { type: Number, default: 0 },
    misc: { type: Number, default: 0 },

    // ── Computed summary ──────────────────────────────────────────
    summary: {
      totalExpenses: { type: Number, default: 0 },
      remaining: { type: Number, default: 0 },
      remainingPct: { type: Number, default: 0 },
      isOverBudget: { type: Boolean, default: false },
    },

    // ── Meta ──────────────────────────────────────────────────────
    name: {
      type: String,
      default: "My Budget Plan",
      trim: true,
      maxlength: 100,
    },
    month: { type: Number, min: 1, max: 12 },
    year: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ── Pre-save: auto-compute totals & summary ───────────────────────
BudgetPlanSchema.pre("save", function () {
  // Category totals
  this.housing.total =
    (this.housing.rent || 0) +
    (this.housing.utilities || 0) +
    (this.housing.emi || 0);

  this.transport.total =
    (this.transport.fuelTransport || 0) +
    (this.transport.vehicleEmi || 0);

  this.food.total =
    (this.food.groceries || 0) + (this.food.diningOut || 0);

  this.health.total =
    (this.health.healthInsurance || 0) +
    (this.health.medicalExpenses || 0);

  const total = this.income.totalIncome;

  this.savings.savingsAmount = Math.round(
    total * (this.savings.savingsPct / 100)
  );
  this.investments.investmentAmount = Math.round(
    total * (this.investments.investmentPct / 100)
  );

  const totalExpenses =
    this.housing.total +
    this.transport.total +
    this.food.total +
    this.health.total +
    this.savings.savingsAmount +
    this.investments.investmentAmount +
    (this.entertainment || 0) +
    (this.misc || 0);

  const remaining = total - totalExpenses;

  this.summary.totalExpenses = totalExpenses;
  this.summary.remaining = remaining;
  this.summary.remainingPct =
    total > 0 ? parseFloat(((remaining / total) * 100).toFixed(2)) : 0;
  this.summary.isOverBudget = remaining < 0;

  
});

module.exports = mongoose.model("BudgetPlan", BudgetPlanSchema);