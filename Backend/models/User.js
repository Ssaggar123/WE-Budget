const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  refreshToken:      { type: String, required: true },
  deviceFingerprint: String,
  device:            String,
  ip:                String,
  location:          String,
  lastRotation:      Date
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type:      String,
    unique:    true,
    required:  true,
    lowercase: true,
    trim:      true
  },
  password: {
    type:   String,
    select: false
  },
  role: {
    type:    String,
    enum:    ["user", "admin"],
    default: "user"
  },
  isVerified: {
    type:    Boolean,
    default: false
  },
  verificationToken: String,
  monthlyIncome:     Number,
  riskProfile: {
    type: String,
    enum: ["Low", "Medium", "High"]
  },
  sessions: [sessionSchema]

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);