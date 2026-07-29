const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateAccessToken, generateRefreshToken } = require("../utils/jwt");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

// ── REGISTER ──────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: "All fields are required." });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ success: false, message: "Email already registered." });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashed, isVerified: true });
    await user.save();

    const token = generateAccessToken(user);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ success: false, message: "Email and password are required." });

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    const token        = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token session
    user.sessions = user.sessions || [];
    user.sessions.push({
      refreshToken,
      device: req.headers["user-agent"],
      ip: req.ip,
      lastRotation: new Date(),
    });
    await user.save();

    // Return token in JSON body (NOT cookies — React Native can't use cookies)
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── REFRESH ───────────────────────────────────────────────────────
router.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ success: false, message: "No refresh token provided." });

    const user = await User.findOne({ "sessions.refreshToken": refreshToken });
    if (!user)
      return res.status(403).json({ success: false, message: "Invalid refresh token." });

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err) => {
      if (err)
        return res.status(403).json({ success: false, message: "Refresh token expired." });

      const newToken = generateAccessToken(user);
      res.status(200).json({ success: true, token: newToken });
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── LOGOUT ────────────────────────────────────────────────────────
router.post("/logout", protect, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const user = await User.findById(req.user._id);
    if (user && refreshToken) {
      user.sessions = user.sessions.filter((s) => s.refreshToken !== refreshToken);
      await user.save();
    }
    res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET ME ────────────────────────────────────────────────────────
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password -sessions");
    res.status(200).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;