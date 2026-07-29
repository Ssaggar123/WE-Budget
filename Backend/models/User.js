const mongoose = require("mongoose");

const SessionSchema = new mongoose.Schema({
  refreshToken: { type: String },
  device:       { type: String },
  ip:           { type: String },
  lastRotation: { type: Date },
});

const UserSchema = new mongoose.Schema(
  {
    name:       { type: String, required: true, trim: true, maxlength: 50 },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 6, select: false },
    isVerified: { type: Boolean, default: true },
    sessions:   [SessionSchema],
  },
  { timestamps: true }
);

// Compare password method
UserSchema.methods.matchPassword = async function (enteredPassword) {
  const bcrypt = require("bcryptjs");
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);