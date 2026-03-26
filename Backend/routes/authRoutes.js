const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");

const router = express.Router();
router.use(cookieParser());

// REGISTER
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashed, isVerified: true });
    await user.save();

    res.json({ message: "Account created successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(400).json({ message: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid credentials" });

    const accessToken  = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.sessions = user.sessions || [];
    user.sessions.push({ refreshToken, device: req.headers["user-agent"], ip: req.ip, lastRotation: new Date() });
    await user.save();

    res
      .cookie("accessToken",  accessToken,  { httpOnly: true, sameSite: "lax" })
      .cookie("refreshToken", refreshToken, { httpOnly: true, sameSite: "lax" })
      .json({ message: "Login successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// REFRESH
router.post("/refresh", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) return res.sendStatus(401);

    const user = await User.findOne({ "sessions.refreshToken": refreshToken });
    if (!user) return res.sendStatus(403);

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err) => {
      if (err) return res.sendStatus(403);
      const accessToken = generateAccessToken(user);
      res.cookie("accessToken", accessToken, { httpOnly: true, sameSite: "lax" }).json({ ok: true });
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// LOGOUT
router.post("/logout", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const user = await User.findOne({ "sessions.refreshToken": refreshToken });
    if (user) {
      user.sessions = user.sessions.filter(s => s.refreshToken !== refreshToken);
      await user.save();
    }
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
