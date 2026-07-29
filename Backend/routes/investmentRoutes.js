const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const BudgetPlan = require("../models/BudgetPlan");
const recommendPlans = require("../services/investmentRecommendation");

// ── GET /api/investments/recommend ──────────────────────────────────
// Uses the user's active budget plan's investment allocation + a risk profile
router.get("/recommend", protect, async (req, res) => {
  try {
    const riskProfile = req.query.riskProfile || "Low"; // Low | Medium | High

    const plan = await BudgetPlan.findOne({ user: req.user._id, isActive: true });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Create a budget plan first so we know how much you can invest.",
      });
    }

    const monthlyInvestable = plan.investments.investmentAmount || 0;

    if (monthlyInvestable <= 0) {
      return res.status(400).json({
        success: false,
        message: "Your budget plan has no investment allocation. Update it in Budget Maker.",
      });
    }

    const result = await recommendPlans(monthlyInvestable, riskProfile);

    res.status(200).json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/investments/all ─────────────────────────────────────────
// Browse all plans, optionally filtered by category
router.get("/all", protect, async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const Investment = require("../models/Investment");
    const plans = await Investment.find(filter).sort({ interestRate: -1 });
    res.status(200).json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;