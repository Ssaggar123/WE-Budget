const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const User = require("../models/User");
const recommendPlans = require("../services/investmentRecommendation");

router.get("/recommend", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user)
      return res.status(404).json({ message: "User not found" });

    if (!user.monthlyIncome)
      return res.status(400).json({ message: "Monthly income not set on profile" });

    const savings = user.monthlyIncome * 0.2;

    const plans = await recommendPlans(savings, user.riskProfile);

    res.json({ savings, recommendedPlans: plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;