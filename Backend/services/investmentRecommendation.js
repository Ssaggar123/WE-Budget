const Investment = require("../models/Investment");

async function recommendPlans(savings, riskProfile) {
  try {
    const plans = await Investment.find({
      riskLevel: riskProfile,
      minInvestment: { $lte: savings },
      maxInvestment: { $gte: savings }
    }).sort({ interestRate: -1 });

    return plans;
  } catch (err) {
    console.error("Recommendation error:", err.message);
    return [];
  }
}

module.exports = recommendPlans;