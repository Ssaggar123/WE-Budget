const express = require("express");
const router = express.Router();
const {
  addExpense,
  getExpenses,
  getMonthSummary,
  deleteExpense,
} = require("../controllers/Expensecontroller");

const authMiddleware = require("../middleware/authMiddleware");
const protect =
  authMiddleware.protect ||
  authMiddleware.auth ||
  authMiddleware.verifyToken ||
  authMiddleware.authenticate ||
  authMiddleware.default ||
  (typeof authMiddleware === "function" ? authMiddleware : null);

router.use(protect);

router.post("/",          addExpense);       // Add expense
router.get("/",           getExpenses);      // Get expenses (filterable)
router.get("/summary",    getMonthSummary);  // Monthly summary vs budget
router.delete("/:id",     deleteExpense);    // Delete expense

module.exports = router;