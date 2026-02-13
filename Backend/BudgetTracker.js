const express = require("express");
const Expense = require("../models/Expense");
const Budget = require("../models/Budget");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/add-expense", auth, async (req, res) => {

    const { budgetId, category, amount, description } = req.body;

    const expense = new Expense({
        userId: req.user.id,
        budgetId,
        category,
        amount,
        description
    });

    await expense.save();

    const budget = await Budget.findById(budgetId);
    budget.remainingBudget -= amount;
    await budget.save();

    if (budget.remainingBudget < 0) {
        return res.json({ message: "⚠ Budget Exceeded!" });
    }

    res.json({ message: "Expense Added", remaining: budget.remainingBudget });
});

module.exports = router;
