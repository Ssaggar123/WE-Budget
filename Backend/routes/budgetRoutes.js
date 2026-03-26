const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Budget = require("../models/Budget");

router.get("/", auth, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.id });
    res.json({ budgets });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/create", auth, async (req, res) => {
  try {
    const { totalBudget, month, year } = req.body;
    const budget = new Budget({
      userId: req.user.id,
      totalBudget,
      remainingBudget: totalBudget,
      month,
      year
    });
    await budget.save();
    res.status(201).json({ message: "Budget created", budget });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
