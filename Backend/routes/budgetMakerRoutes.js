const express = require("express");
const router = express.Router();

const {
  createBudgetPlan,
  getBudgetPlans,
  getBudgetPlanById,
  updateBudgetPlan,
  deleteBudgetPlan,
  getActiveBudgetPlan,
  setActiveBudgetPlan,
} = require("../controllers/budgetMakerController");

// ── Load auth middleware ──────────────────────────────────────────
// Supports all common export styles from authMiddleware.js
const authMiddleware = require("../middleware/authMiddleware");

const protect =
  authMiddleware.protect ||       // { protect }
  authMiddleware.auth ||          // { auth }
  authMiddleware.verifyToken ||   // { verifyToken }
  authMiddleware.authenticate ||  // { authenticate }
  authMiddleware.default ||       // ES module default
  (typeof authMiddleware === "function" ? authMiddleware : null); // direct export

if (!protect) {
  throw new Error(
    "[budgetMakerRoutes] Could not find auth middleware. " +
    "Check the export name in authMiddleware.js and update this file."
  );
}

// ── All routes require authentication ─────────────────────────────
router.use(protect);

// ── CRUD routes ───────────────────────────────────────────────────
router.post("/",                createBudgetPlan);    // Create new plan
router.get("/",                 getBudgetPlans);      // Get all plans
router.get("/active",           getActiveBudgetPlan); // Get active plan
router.get("/:id",              getBudgetPlanById);   // Get single plan
router.put("/:id",              updateBudgetPlan);    // Update plan
router.delete("/:id",           deleteBudgetPlan);    // Delete plan
router.patch("/:id/activate",   setActiveBudgetPlan); // Set as active

module.exports = router;