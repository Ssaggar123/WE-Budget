const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const User = require("../models/User");
const BudgetPlan = require("../models/BudgetPlan");
const recommendPlans = require("../services/investmentRecommendation");
const { getStockWatchlist, getMutualFundNavs } = require("../services/marketData");


// ── GET /api/investments/recommend ──────────────────────────────────
// Uses the user's active budget plan's investment allocation + a risk profile
router.get("/debug-count", async (req, res) => {
  const Investment = require("../models/Investment");
  const count = await Investment.countDocuments();
  res.json({ count });
});
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

// ── GET /api/investments/catalogue ───────────────────────────────────
// Full, unfiltered catalogue — NOT tied to the user's budget plan.
// Combines DB-stored assured-return schemes with live market data.
router.get("/catalogue", protect, async (req, res) => {
  try {
    const Investment = require("../models/Investment");

    const [assuredReturns, mutualFundsCurated, stocksResult, mutualFundsLiveResult] =
      await Promise.all([
        Investment.find({ category: { $in: ["Govt", "Bank"] } }).sort({ interestRate: -1 }),
        Investment.find({ category: "MutualFund" }).sort({ interestRate: -1 }),
        getStockWatchlist(),
        getMutualFundNavs(),
      ]);

    res.status(200).json({
      success: true,
      data: {
        assuredReturns,
        mutualFunds: {
          curated: mutualFundsCurated,
          live: mutualFundsLiveResult.data,
          liveCached: mutualFundsLiveResult.cached,
        },
        stocks: {
          live: stocksResult.data,
          liveCached: stocksResult.cached,
          stale: stocksResult.stale || false,
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
module.exports = router;