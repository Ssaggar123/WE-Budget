const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema({
  schemeName:    String,
  organization:  String,
  interestRate:  Number,
  minInvestment: Number,
  maxInvestment: Number,
  riskLevel:     { type: String, enum: ["Low", "Medium", "High"] },
  lockInYears:   Number,
  liquidity:     String,
  category:      { type: String, enum: ["Govt", "Bank", "MutualFund"] }
}, { timestamps: true });

module.exports = mongoose.model("Investment", investmentSchema);