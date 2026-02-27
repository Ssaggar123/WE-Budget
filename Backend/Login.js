// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const uuid = require("uuid");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");

const User = require("../models/User");
const limiter = require("../middleware/rateLimiter");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const { sendVerification } = require("../utils/email");

const router = express.Router();
router.use(cookieParser());


// REGISTER + EMAIL VERIFICATION
router.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);
    const verificationToken = uuid.v4();

    const user = new User({
        name,
        email,
        password: hashed,
        verificationToken
    });

    await user.save();
    await sendVerification(email, verificationToken);

    res.json({ message: "Check email to verify account" });
});


// VERIFY EMAIL
router.get("/verify/:token", async (req, res) => {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) return res.status(400).send("Invalid token");

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.send("Email verified");
});


// LOGIN (Rate Limited)
router.post("/login", limiter, async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !user.isVerified)
        return res.status(400).json({ message: "Invalid or unverified" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Wrong password" });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res
        .cookie("accessToken", accessToken, { httpOnly: true, secure: false })
        .cookie("refreshToken", refreshToken, { httpOnly: true, secure: false })
        .json({ message: "Login success" });
});


// REFRESH TOKEN AUTO ACCESS TOKEN
router.post("/refresh", async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) return res.sendStatus(401);

    const user = await User.findOne({ refreshToken });
    if (!user) return res.sendStatus(403);

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err) => {
        if (err) return res.sendStatus(403);

        const accessToken = generateAccessToken(user);

        res.cookie("accessToken", accessToken, { httpOnly: true }).json({ ok: true });
    });
});


// LOGOUT (Invalidate refresh token)
router.post("/logout", async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    const user = await User.findOne({ refreshToken });
    if (user) {
        user.refreshToken = null;
        await user.save();
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.json({ message: "Logged out" });
});

module.exports = router;