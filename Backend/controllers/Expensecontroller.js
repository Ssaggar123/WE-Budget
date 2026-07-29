const Expense = require("../models/Expense");
const BudgetPlan = require("../models/BudgetPlan");

// ── Category limit extractor from BudgetPlan ──────────────────────
const getCategoryLimits = (plan) => ({
  Housing:       plan.housing.total,
  Transport:     plan.transport.total,
  Food:          plan.food.total,
  Health:        plan.health.total,
  Savings:       plan.savings.savingsAmount,
  Investments:   plan.investments.investmentAmount,
  Entertainment: plan.entertainment,
  Misc:          plan.misc,
});

// ── Check thresholds and build notification payload ───────────────
const checkThresholds = (category, spent, limit, expense) => {
  const notifications = [];
  const pct = limit > 0 ? (spent / limit) * 100 : 0;

  if (pct >= 100 && !expense.notified100) {
    notifications.push({
      type: "exceeded",
      category,
      spent,
      limit,
      pct: pct.toFixed(1),
      message: `🚨 ${category} budget exceeded! Spent ₹${spent.toLocaleString("en-IN")} of ₹${limit.toLocaleString("en-IN")}`,
    });
    expense.notified100 = true;
  } else if (pct >= 80 && !expense.notified80) {
    notifications.push({
      type: "warning",
      category,
      spent,
      limit,
      pct: pct.toFixed(1),
      message: `⚠️ ${category} at ${pct.toFixed(0)}% — ₹${(limit - spent).toLocaleString("en-IN")} remaining`,
    });
    expense.notified80 = true;
  }
  return notifications;
};

// ── POST /api/expenses ────────────────────────────────────────────
const addExpense = async (req, res) => {
  try {
    const {
      amount, category, description,
      date, source, receipt,
    } = req.body;

    // Get active budget plan
    const plan = await BudgetPlan.findOne({
      user: req.user._id,
      isActive: true,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "No active budget plan found. Create a budget plan first.",
      });
    }

    const now = date ? new Date(date) : new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Create expense
    const expense = new Expense({
      user: req.user._id,
      budgetPlan: plan._id,
      amount: parseFloat(amount),
      category,
      description,
      date: now,
      month,
      year,
      source: source || "manual",
      receipt: receipt || {},
    });

    // Get total spent in this category this month
    const categorySpent = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          category,
          month,
          year,
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const prevSpent = categorySpent[0]?.total || 0;
    const newSpent = prevSpent + parseFloat(amount);

    const limits = getCategoryLimits(plan);
    const categoryLimit = limits[category] || 0;

    // Check category thresholds
    const notifications = checkThresholds(
      category,
      newSpent,
      categoryLimit,
      expense
    );

    // Check overall budget
    const overallSpent = await Expense.aggregate([
      { $match: { user: req.user._id, month, year } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalSpentSoFar = (overallSpent[0]?.total || 0) + parseFloat(amount);
    const totalIncome = plan.income.totalIncome;
    const overallPct = totalIncome > 0 ? (totalSpentSoFar / totalIncome) * 100 : 0;

    if (overallPct >= 100) {
      notifications.push({
        type: "overall_exceeded",
        spent: totalSpentSoFar,
        limit: totalIncome,
        pct: overallPct.toFixed(1),
        message: `🚨 Overall budget exceeded! Spent ₹${totalSpentSoFar.toLocaleString("en-IN")} of ₹${totalIncome.toLocaleString("en-IN")}`,
      });
    } else if (overallPct >= 80) {
      notifications.push({
        type: "overall_warning",
        spent: totalSpentSoFar,
        limit: totalIncome,
        pct: overallPct.toFixed(1),
        message: `⚠️ Overall spending at ${overallPct.toFixed(0)}% of monthly income`,
      });
    }

    await expense.save();

    res.status(201).json({
      success: true,
      message: "Expense added successfully",
      data: expense,
      notifications,
      summary: {
        categorySpent: newSpent,
        categoryLimit,
        categoryPct: categoryLimit > 0 ? ((newSpent / categoryLimit) * 100).toFixed(1) : 0,
        overallSpent: totalSpentSoFar,
        overallIncome: totalIncome,
        overallPct: overallPct.toFixed(1),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add expense",
      error: error.message,
    });
  }
};

// ── GET /api/expenses ─────────────────────────────────────────────
const getExpenses = async (req, res) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
      category,
      limit = 50,
      page = 1,
    } = req.query;

    const filter = {
      user: req.user._id,
      month: parseInt(month),
      year: parseInt(year),
    };
    if (category) filter.category = category;

    const total = await Expense.countDocuments(filter);
    const expenses = await Expense.find(filter)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .select("-__v");

    res.status(200).json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: expenses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch expenses",
      error: error.message,
    });
  }
};

// ── GET /api/expenses/summary ─────────────────────────────────────
// Full monthly summary: spent vs limit per category
const getMonthSummary = async (req, res) => {
  try {
    const {
      month = new Date().getMonth() + 1,
      year = new Date().getFullYear(),
    } = req.query;

    const plan = await BudgetPlan.findOne({
      user: req.user._id,
      isActive: true,
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "No active budget plan found.",
      });
    }

    // Aggregate spent per category
    const spentByCategory = await Expense.aggregate([
      {
        $match: {
          user: req.user._id,
          month: parseInt(month),
          year: parseInt(year),
        },
      },
      {
        $group: {
          _id: "$category",
          spent: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const limits = getCategoryLimits(plan);
    const spentMap = {};
    spentByCategory.forEach((s) => { spentMap[s._id] = { spent: s.spent, count: s.count }; });

    const categories = Object.keys(limits).map((cat) => {
      const spent = spentMap[cat]?.spent || 0;
      const limit = limits[cat] || 0;
      const pct = limit > 0 ? (spent / limit) * 100 : 0;
      return {
        category: cat,
        spent,
        limit,
        remaining: Math.max(limit - spent, 0),
        pct: parseFloat(pct.toFixed(1)),
        status:
          pct >= 100 ? "exceeded" :
          pct >= 80  ? "warning"  :
          pct >= 50  ? "moderate" : "safe",
        count: spentMap[cat]?.count || 0,
      };
    });

    const totalSpent = categories.reduce((a, c) => a + c.spent, 0);
    const totalIncome = plan.income.totalIncome;
    const overallPct = totalIncome > 0 ? (totalSpent / totalIncome) * 100 : 0;

    res.status(200).json({
      success: true,
      data: {
        month: parseInt(month),
        year: parseInt(year),
        plan: {
          id: plan._id,
          name: plan.name,
          totalIncome,
        },
        categories,
        overall: {
          totalSpent,
          totalIncome,
          remaining: Math.max(totalIncome - totalSpent, 0),
          pct: parseFloat(overallPct.toFixed(1)),
          status:
            overallPct >= 100 ? "exceeded" :
            overallPct >= 80  ? "warning"  :
            overallPct >= 50  ? "moderate" : "safe",
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch summary",
      error: error.message,
    });
  }
};

// ── DELETE /api/expenses/:id ──────────────────────────────────────
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: "Expense not found" });
    }
    res.status(200).json({ success: true, message: "Expense deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { addExpense, getExpenses, getMonthSummary, deleteExpense };