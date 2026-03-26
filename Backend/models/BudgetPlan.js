const mongoose = require("mongoose");

const moneyField = { type: Number, default: 0, min: 0 };

const budgetPlanSchema = new mongoose.Schema({

  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // ── Time Constraints ──────────────────────────────────────────────────
  period:    { type: Number, enum: [1, 3, 6, 12], default: 1 },
  startDate: { type: Date },
  endDate:   { type: Date, validate: {
    validator: function(v) { return !v || !this.startDate || v > this.startDate; },
    message: "End date must be after start date"
  }},

  // ── Income & Resource Constraints ─────────────────────────────────────
  income: {
    primary:         { type: Number, required: true, min: 1 },
    secondary:       moneyField,
    certaintyPct:    { type: Number, default: 85, min: 0, max: 100 },
    contractType:    { type: String, enum: ["permanent","contract","freelance","part-time","business"], default: "permanent" },
    noticePeriodDays:{ type: Number, default: 30, min: 0 },
  },

  timeConstraints: {
    workHoursPerMonth: { type: Number, default: 160, min: 0, max: 744 },
    periodMonths:      { type: Number, default: 1 },
  },

  // ── Fixed Expenses ────────────────────────────────────────────────────
  fixedExpenses: {
    rent:          moneyField,
    utilities:     moneyField,
    insurance:     moneyField,
    internet:      moneyField,
    subscriptions: moneyField,
    schoolFees:    moneyField,
    houseHelp:     moneyField,
    other:         moneyField,
  },

  // ── Variable Expenses ─────────────────────────────────────────────────
  variableExpenses: {
    groceries:    moneyField,
    transport:    moneyField,
    entertainment:moneyField,
    healthcare:   moneyField,
    clothing:     moneyField,
    education:    moneyField,
    personalCare: moneyField,
    misc:         moneyField,
  },

  // ── Debt Repayment ────────────────────────────────────────────────────
  debtRepayment: {
    emi:          moneyField,
    creditCard:   moneyField,
    personalLoan: moneyField,
    other:        moneyField,
  },

  // ── Legal, Regulatory & Policy ────────────────────────────────────────
  legalPolicy: {
    taxRegime:      { type: String, enum: ["new","old"], default: "new" },
    taxDeducted:    moneyField,
    sec80c:         { type: Number, default: 0, min: 0, max: 150000,
                      validate: { validator: v => v <= 150000, message: "Section 80C cannot exceed ₹1,50,000" }},
    sec80d:         moneyField,
    npsContribution:moneyField,
    gstApplicable:  { type: Boolean, default: false },
    activePolicies: [String],
  },

  // ── Goals & Priorities ────────────────────────────────────────────────
  goalsAndPriorities: {
    savingsGoal:      moneyField,
    investment:       moneyField,
    sipAmount:        moneyField,
    emergencyFundMonths: { type: Number, default: 3, min: 0, max: 24 },
    riskProfile:      { type: String, enum: ["Low","Medium","High"], default: "Medium" },
    horizonYears:     { type: Number, default: 5, min: 1 },
    activeGoals:      [String],
  },

  // ── Resource Constraints ──────────────────────────────────────────────
  resourceConstraints: {
    teamSize:        { type: Number, default: 0 },
    vendorCap:       moneyField,
    projectBudgetCap:moneyField,
    tags:            [String],
  },

  // ── Uncertainty & Assumptions ─────────────────────────────────────────
  uncertainty: {
    incomeCertaintyPct:  { type: Number, default: 85 },
    inflationPct:        { type: Number, default: 5.5 },
    scopeCreepPct:       { type: Number, default: 10 },
    contingencyReserve:  moneyField,
    hiddenCosts:         moneyField,
    revenueGrowthPct:    { type: Number, default: 0 },
    assumptions:         { type: String, maxlength: 2000 },
    dataSource:          { type: String, enum: ["statement","app","estimate"], default: "estimate" },
  },

  // ── Audit Checklist ───────────────────────────────────────────────────
  auditChecklist: [{
    id:      String,
    label:   String,
    checked: { type: Boolean, default: false },
  }],

  pitfallAuditComplete: { type: Boolean, default: false },

  // ── Computed Summary (stored for history/dashboards) ──────────────────
  summary: {
    netIncome:     Number,
    totalExpenses: Number,
    remaining:     Number,
    savingsPct:    Number,
    debtRatio:     Number,
    score:         Number,
    pitfallCount:  Number,
  },

  status: { type: String, enum: ["draft","active","archived"], default: "active" },

}, { timestamps: true });

// Prevent duplicate active budgets for same user/period
budgetPlanSchema.index({ userId: 1, status: 1, startDate: 1 });

module.exports = mongoose.model("BudgetPlan", budgetPlanSchema);

