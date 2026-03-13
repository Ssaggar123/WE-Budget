
const jwt = require("jsonwebtoken");

exports.generateAccessToken = (user) =>
    jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
        expiresIn: "15m"
    });

exports.generateRefreshToken = (user) =>
    jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: "7d"
    });
  // utils/email.js
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendVerification = async (email, token) => {
    const link = `http://localhost:5000/api/auth/verify/${token}`;

    await transporter.sendMail({
        to: email,
        subject: "Verify Email",
        html: `<h3>Click to verify</h3><a href="${link}">${link}</a>`
    });
};