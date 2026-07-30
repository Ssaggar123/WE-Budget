const Investment = require("../models/Investment");

/**
 * Recommend investment plans based on risk profile and monthly investable amount.
 * @param {number} monthlyInvestable - amount user can invest per month (from Budget Maker)
 * @param {string} riskProfile - "Low" | "Medium" | "High"
 */
async function recommendPlans(monthlyInvestable, riskProfile = "Low") {
  const riskOrder = { Low: ["Low"], Medium: ["Low", "Medium"], High: ["Low", "Medium", "High"] };
  const allowedRisks = riskOrder[riskProfile] || ["Low"];

  // Rough annual amount available to invest
  const annualInvestable = monthlyInvestable * 12;
      console.log("DEBUG riskProfile:", riskProfile);
    console.log("DEBUG allowedRisks:", allowedRisks);
    console.log("DEBUG annualInvestable:", annualInvestable);
  const plans = await Investment.find({
    riskLevel: { $in: allowedRisks },
    minInvestment: { $lte: Math.max(annualInvestable, 500) },
  }).sort({ interestRate: -1 });
 console.log("DEBUG plans found:", plans.length);
  if (plans.length > 0) {
    console.log("DEBUG sample plan:", JSON.stringify(plans[0]));
  }
  // Split into "best fit" (within budget) vs "aspirational" (good rate, needs bigger lump sum)
  const withinBudget = plans.filter((p) => p.minInvestment <= annualInvestable);
  const aspirational = plans.filter((p) => p.minInvestment > annualInvestable).slice(0, 3);
   console.log("DEBUG withinBudget:", withinBudget.length, "aspirational:", aspirational.length);
  return {
    monthlyInvestable,
    annualInvestable,
    riskProfile,
    recommended: withinBudget.slice(0, 8),
    aspirational,
  };
}

module.exports = recommendPlans;