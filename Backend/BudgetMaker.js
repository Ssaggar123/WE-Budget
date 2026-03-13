// ══════════════════════════════════════════════════════════════════════════
// models/BudgetPlan.js
// Full schema matching the React form payload
// ══════════════════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════════════════
// routes/budgetMakerRoutes.js
// Full CRUD with validation middleware
// ══════════════════════════════════════════════════════════════════════════

const express   = require("express");
const router    = express.Router();
const auth      = require("../middleware/authMiddleware");
const BudgetPlan = require("../models/BudgetPlan");

// ─── Validation middleware ────────────────────────────────────────────────
function validateBudget(req, res, next) {
  const { income, legalPolicy, timeConstraints } = req.body;
  const errors = [];

  // Required income
  if (!income?.primary || income.primary <= 0)
    errors.push("Primary income is required and must be greater than 0");

  // 80C statutory cap
  if (legalPolicy?.sec80c > 150000)
    errors.push("Section 80C investment cannot exceed ₹1,50,000 per year");

  // Date logic
  if (req.body.startDate && req.body.endDate) {
    if (new Date(req.body.endDate) <= new Date(req.body.startDate))
      errors.push("End date must be after start date");
  }

  // Audit completeness check
  const auditItems = req.body.auditChecklist || [];
  const allChecked = auditItems.length > 0 && auditItems.every(a => a.checked);
  if (!allChecked)
    errors.push("All self-audit checklist items must be completed before saving");

  if (errors.length > 0)
    return res.status(400).json({ success: false, errors });

  next();
}

// ─── Compute server-side summary ─────────────────────────────────────────
function computeSummary(data) {
  const p  = data.period || 1;
  const n  = (obj, key) => Number(obj?.[key]) || 0;
  const cp = data.uncertainty?.incomeCertaintyPct ?? 85;

  const grossIncome = (n(data.income, "primary") + n(data.income, "secondary")) * (cp / 100) - n(data.legalPolicy, "taxDeducted");
  const netIncome   = Math.max(0, grossIncome) * p;

  const fe = data.fixedExpenses    || {};
  const ve = data.variableExpenses || {};
  const dr = data.debtRepayment    || {};
  const gp = data.goalsAndPriorities || {};
  const rc = data.resourceConstraints || {};

  const fixed    = Object.values(fe).reduce((a,b)=>a+Number(b||0), 0) * p;
  const variable = Object.values(ve).reduce((a,b)=>a+Number(b||0), 0) * p;
  const debt     = Object.values(dr).reduce((a,b)=>a+Number(b||0), 0) * p;
  const goals    = (n(gp,"savingsGoal")+n(gp,"investment")+n(gp,"sipAmount")) * p;
  const legal    = (n(data.legalPolicy,"sec80c")/12 + n(data.legalPolicy,"sec80d")/12 + n(data.legalPolicy,"npsContribution")) * p;

  const base      = (fixed + variable + debt) * (1 + (data.uncertainty?.inflationPct||0) / 100);
  const scopeBuf  = base * ((data.uncertainty?.scopeCreepPct||0) / 100);
  const hidden    = n(data.uncertainty, "hiddenCosts") * p;
  const cont      = n(data.uncertainty, "contingencyReserve") * p;

  const totalExpenses = base + scopeBuf + hidden + cont + goals + legal;
  const remaining     = netIncome - totalExpenses;
  const savingsPct    = netIncome > 0 ? Math.max(0, (remaining / netIncome) * 100) : 0;
  const debtRatio     = netIncome > 0 ? (debt / p / (netIncome / p)) * 100 : 0;

  // Score
  let score = 100;
  if (remaining < 0)        score -= 35;
  else if (savingsPct < 10) score -= 20;
  else if (savingsPct < 20) score -= 10;
  if (debtRatio > 40)       score -= 10;
  const auditBonus = Math.round(((data.auditChecklist||[]).filter(a=>a.checked).length / 8) * 25);
  score = Math.min(100, Math.max(0, score + auditBonus));

  return { netIncome, totalExpenses, remaining, savingsPct, debtRatio, score,
           pitfallCount: remaining < 0 ? 3 : savingsPct < 10 ? 2 : 0 };
}

// ─── POST /api/budgetmaker/create ─────────────────────────────────────────
router.post("/create", auth, validateBudget, async (req, res) => {
  try {
    const summary = computeSummary(req.body);

    const plan = new BudgetPlan({
      userId: req.user.id,
      ...req.body,
      summary,
      pitfallAuditComplete: (req.body.auditChecklist||[]).every(a => a.checked),
    });

    await plan.save();

    res.status(201).json({
      success: true,
      message: "Budget plan created successfully",
      planId:  plan._id,
      summary,
    });
  } catch (err) {
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, errors });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/budgetmaker/list ────────────────────────────────────────────
router.get("/list", auth, async (req, res) => {
  try {
    const plans = await BudgetPlan
      .find({ userId: req.user.id, status: { $ne: "archived" } })
      .select("period startDate endDate summary status createdAt")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/budgetmaker/:id ─────────────────────────────────────────────
router.get("/:id", auth, async (req, res) => {
  try {
    const plan = await BudgetPlan.findOne({ _id: req.params.id, userId: req.user.id });
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    res.json({ success: true, plan });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/budgetmaker/:id ─────────────────────────────────────────────
router.put("/:id", auth, validateBudget, async (req, res) => {
  try {
    const summary = computeSummary(req.body);
    const plan = await BudgetPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...req.body, summary, updatedAt: new Date() },
      { new: true, runValidators: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    res.json({ success: true, message: "Budget plan updated", summary });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/budgetmaker/:id (soft delete) ────────────────────────────
router.delete("/:id", auth, async (req, res) => {
  try {
    const plan = await BudgetPlan.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { status: "archived" },
      { new: true }
    );
    if (!plan) return res.status(404).json({ success: false, message: "Plan not found" });
    res.json({ success: true, message: "Budget plan archived" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;