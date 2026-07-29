const BudgetPlan = require("../models/BudgetPlan");

// ── Helpers ───────────────────────────────────────────────────────
const buildPlanData = (body, userId) => {
  const {
    name, month, year,
    salary, otherIncome,
    rent, utilities, emi,
    fuelTransport, vehicleEmi,
    groceries, diningOut,
    healthInsurance, medicalExpenses,
    savingsPct, investmentPct,
    entertainmentBudget, miscBudget,
  } = body;

  const totalIncome =
    (parseFloat(salary) || 0) + (parseFloat(otherIncome) || 0);

  return {
    user: userId,
    name: name || "My Budget Plan",
    month: month || new Date().getMonth() + 1,
    year: year || new Date().getFullYear(),
    income: {
      salary: parseFloat(salary) || 0,
      otherIncome: parseFloat(otherIncome) || 0,
      totalIncome,
    },
    housing: {
      rent: parseFloat(rent) || 0,
      utilities: parseFloat(utilities) || 0,
      emi: parseFloat(emi) || 0,
    },
    transport: {
      fuelTransport: parseFloat(fuelTransport) || 0,
      vehicleEmi: parseFloat(vehicleEmi) || 0,
    },
    food: {
      groceries: parseFloat(groceries) || 0,
      diningOut: parseFloat(diningOut) || 0,
    },
    health: {
      healthInsurance: parseFloat(healthInsurance) || 0,
      medicalExpenses: parseFloat(medicalExpenses) || 0,
    },
    savings: {
      savingsPct: parseFloat(savingsPct) || 20,
    },
    investments: {
      investmentPct: parseFloat(investmentPct) || 10,
    },
    entertainment: parseFloat(entertainmentBudget) || 0,
    misc: parseFloat(miscBudget) || 0,
  };
};

// ── POST /api/budget-maker ─────────────────────────────────────────
// Create a new budget plan
const createBudgetPlan = async (req, res) => {
  try {
    const data = buildPlanData(req.body, req.user._id);

    // Deactivate all existing plans for this user
    await BudgetPlan.updateMany(
      { user: req.user._id },
      { isActive: false }
    );

    const plan = new BudgetPlan({ ...data, isActive: true });
    await plan.save();

    res.status(201).json({
      success: true,
      message: "Budget plan created successfully",
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create budget plan",
      error: error.message,
    });
  }
};

// ── GET /api/budget-maker ──────────────────────────────────────────
// Get all plans for logged-in user
const getBudgetPlans = async (req, res) => {
  try {
    const { month, year, limit = 10, page = 1 } = req.query;
    const filter = { user: req.user._id };

    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const total = await BudgetPlan.countDocuments(filter);
    const plans = await BudgetPlan.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select("-__v");

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: plans,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch budget plans",
      error: error.message,
    });
  }
};

// ── GET /api/budget-maker/active ───────────────────────────────────
// Get the currently active plan
const getActiveBudgetPlan = async (req, res) => {
  try {
    const plan = await BudgetPlan.findOne({
      user: req.user._id,
      isActive: true,
    }).select("-__v");

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "No active budget plan found",
      });
    }

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch active budget plan",
      error: error.message,
    });
  }
};

// ── GET /api/budget-maker/:id ──────────────────────────────────────
// Get a single plan by ID
const getBudgetPlanById = async (req, res) => {
  try {
    const plan = await BudgetPlan.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).select("-__v");

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Budget plan not found",
      });
    }

    res.status(200).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch budget plan",
      error: error.message,
    });
  }
};

// ── PUT /api/budget-maker/:id ──────────────────────────────────────
// Update an existing plan
const updateBudgetPlan = async (req, res) => {
  try {
    const existing = await BudgetPlan.findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Budget plan not found",
      });
    }

    const data = buildPlanData(
      { ...existing.toObject(), ...req.body },
      req.user._id
    );

    Object.assign(existing, data);
    await existing.save(); // triggers pre-save hook to recompute totals

    res.status(200).json({
      success: true,
      message: "Budget plan updated successfully",
      data: existing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update budget plan",
      error: error.message,
    });
  }
};

// ── DELETE /api/budget-maker/:id ───────────────────────────────────
// Delete a plan
const deleteBudgetPlan = async (req, res) => {
  try {
    const plan = await BudgetPlan.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Budget plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Budget plan deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete budget plan",
      error: error.message,
    });
  }
};

// ── PATCH /api/budget-maker/:id/activate ──────────────────────────
// Set a plan as the active one
const setActiveBudgetPlan = async (req, res) => {
  try {
    await BudgetPlan.updateMany(
      { user: req.user._id },
      { isActive: false }
    );

    const plan = await BudgetPlan.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isActive: true },
      { new: true }
    );

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Budget plan not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Budget plan set as active",
      data: plan,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to activate budget plan",
      error: error.message,
    });
  }
};

module.exports = {
  createBudgetPlan,
  getBudgetPlans,
  getBudgetPlanById,
  updateBudgetPlan,
  deleteBudgetPlan,
  getActiveBudgetPlan,
  setActiveBudgetPlan,
};