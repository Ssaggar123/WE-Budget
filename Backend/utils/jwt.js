const jwt = require("jsonwebtoken");

exports.generateAccessToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "30d" });

exports.generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "7d" });

exports.verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
