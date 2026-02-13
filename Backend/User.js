const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    monthlyIncome: Number,
    riskProfile: {
        type: String,
        enum: ["Low", "Medium", "High"]
    }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
