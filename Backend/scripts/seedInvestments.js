// One-time (or periodic) seed script to populate real government/PSU/bank
// investment plans. Run with: node scripts/seedInvestments.js
// Rates as of July 2026 — update periodically since govt schemes reset quarterly.

require("dotenv").config();
const mongoose = require("mongoose");
const Investment = require("../models/Investment");

const investments = [
  // ── Government-backed small savings schemes (Post Office) ──────────
  {
    schemeName: "Public Provident Fund (PPF)",
    organization: "Government of India / India Post",
    interestRate: 7.1,
    minInvestment: 500,
    maxInvestment: 150000,
    riskLevel: "Low",
    lockInYears: 15,
    liquidity: "Partial withdrawal allowed from year 7",
    category: "Govt",
  },
  {
    schemeName: "Sukanya Samriddhi Yojana (SSY)",
    organization: "Government of India / India Post",
    interestRate: 8.2,
    minInvestment: 250,
    maxInvestment: 150000,
    riskLevel: "Low",
    lockInYears: 21,
    liquidity: "Partial withdrawal at age 18 for education",
    category: "Govt",
  },
  {
    schemeName: "Senior Citizen Savings Scheme (SCSS)",
    organization: "Government of India / India Post",
    interestRate: 8.2,
    minInvestment: 1000,
    maxInvestment: 3000000,
    riskLevel: "Low",
    lockInYears: 5,
    liquidity: "Premature closure allowed with penalty",
    category: "Govt",
  },
  {
    schemeName: "National Savings Certificate (NSC)",
    organization: "Government of India / India Post",
    interestRate: 7.7,
    minInvestment: 1000,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 5,
    liquidity: "Locked till maturity (loan against NSC possible)",
    category: "Govt",
  },
  {
    schemeName: "Kisan Vikas Patra (KVP)",
    organization: "Government of India / India Post",
    interestRate: 7.5,
    minInvestment: 1000,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 9.6,
    liquidity: "Encashable after 2.5 years",
    category: "Govt",
  },
  {
    schemeName: "Post Office Time Deposit (5-Year)",
    organization: "India Post",
    interestRate: 7.5,
    minInvestment: 1000,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 5,
    liquidity: "Premature withdrawal after 6 months with reduced rate",
    category: "Govt",
  },
  {
    schemeName: "Post Office Recurring Deposit (RD)",
    organization: "India Post",
    interestRate: 6.7,
    minInvestment: 100,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 5,
    liquidity: "Premature closure allowed after 3 years",
    category: "Govt",
  },
  {
    schemeName: "RBI Floating Rate Savings Bond 2020 (Taxable)",
    organization: "Reserve Bank of India / Govt of India",
    interestRate: 8.05,
    minInvestment: 1000,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 7,
    liquidity: "Premature exit only for senior citizens (60+)",
    category: "Govt",
  },

  // ── Public sector bank fixed/recurring deposits ─────────────────────
  {
    schemeName: "SBI Fixed Deposit (1-2 year)",
    organization: "State Bank of India",
    interestRate: 6.45,
    minInvestment: 1000,
    maxInvestment: 30000000,
    riskLevel: "Low",
    lockInYears: 1,
    liquidity: "Premature withdrawal with penalty (0.5%-1%)",
    category: "Bank",
  },
  {
    schemeName: "SBI Amrit Vrishti FD (444 days)",
    organization: "State Bank of India",
    interestRate: 6.45,
    minInvestment: 1000,
    maxInvestment: 30000000,
    riskLevel: "Low",
    lockInYears: 1.2,
    liquidity: "Premature withdrawal with penalty",
    category: "Bank",
  },
  {
    schemeName: "SBI Recurring Deposit",
    organization: "State Bank of India",
    interestRate: 6.5,
    minInvestment: 100,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 1,
    liquidity: "Premature closure allowed with penalty",
    category: "Bank",
  },
  {
    schemeName: "Punjab National Bank Fixed Deposit",
    organization: "Punjab National Bank",
    interestRate: 6.5,
    minInvestment: 1000,
    maxInvestment: 20000000,
    riskLevel: "Low",
    lockInYears: 1,
    liquidity: "Premature withdrawal with penalty",
    category: "Bank",
  },

  // ── PSU-linked mutual funds (market-linked, not guaranteed) ─────────
  {
    schemeName: "SBI Long Term Equity Fund (ELSS)",
    organization: "SBI Mutual Fund",
    interestRate: 12,
    minInvestment: 500,
    maxInvestment: 10000000,
    riskLevel: "High",
    lockInYears: 3,
    liquidity: "Locked for 3 years (tax-saving ELSS)",
    category: "MutualFund",
  },
  {
    schemeName: "SBI Balanced Advantage Fund",
    organization: "SBI Mutual Fund",
    interestRate: 10,
    minInvestment: 500,
    maxInvestment: 10000000,
    riskLevel: "Medium",
    lockInYears: 0,
    liquidity: "Open-ended, redeemable anytime (exit load may apply)",
    category: "MutualFund",
  },
  {
    schemeName: "LIC MF Debt Fund",
    organization: "LIC Mutual Fund",
    interestRate: 7.5,
    minInvestment: 1000,
    maxInvestment: 10000000,
    riskLevel: "Low",
    lockInYears: 0,
    liquidity: "Open-ended, redeemable anytime",
    category: "MutualFund",
  },
];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/we_budget");
    console.log("✅ MongoDB connected");

    await Investment.deleteMany({});
    await Investment.insertMany(investments);

    console.log(`✅ Seeded ${investments.length} investment plans`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
}

seed();