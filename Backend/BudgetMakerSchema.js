
// models/BudgetMaker.js
const mongoose = require("mongoose");

const budgetMakerSchema = new mongoose.Schema({
    userId: String,

    income: Number,
    investment: Number,

    fixedExpenses: {
        rent: Number,
        utilities: Number,
        insurance: Number
    },

    variableExpenses: {
        groceries: Number,
        entertainment: Number,
        transport: Number
    },

    debtRepayment: {
        emi: Number,
        creditCard: Number
    },

    savingsGoal: Number,
    totalExpenses: Number,
    remaining: Number,

    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("BudgetMaker", budgetMakerSchema);