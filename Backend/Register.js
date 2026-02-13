const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();


// REGISTER PAGE
router.post("/register", async (req, res) => {
    try {
        const { name, email, password, monthlyIncome, riskProfile } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            monthlyIncome,
            riskProfile
        });

        await user.save();

        res.json({ message: "User Registered Successfully" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
