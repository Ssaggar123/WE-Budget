const express = require("express");
const Budget = require("../models/Budget");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-budget", auth, async (req, res) => {

    const { month, year, categories } = req.body;

    const totalBudget = categories.reduce(
        (sum, item) => sum + item.allocatedAmount, 0
    );

    const budget = new Budget({
        userId: req.user.id,
        month,
        year,
        categories,
        totalBudget,
        remainingBudget: totalBudget
    });

    await budget.save();
    res.json({ message: "Budget Created", budget });
});

module.exports = router;
