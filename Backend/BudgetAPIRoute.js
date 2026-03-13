
const express = require("express");
const router = express.Router();
const BudgetMaker = require("../models/BudgetMaker");
const auth = require("../middleware/authMiddleware");

router.post("/create", async (req, res) => {
    try {

        const data = req.body;

        const budget = new BudgetMaker(data);
        await budget.save();

        res.json({
            success: true,
            message: "Budget saved successfully",
            budget
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.get("/:userId", async (req, res) => {
    const budgets = await BudgetMaker.find({ userId: req.params.userId });
    res.json(budgets);
});

module.exports = router;
async function createBudget(data) {

    const res = await apiFetch("/budgetmaker/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    console.log(result);
}
