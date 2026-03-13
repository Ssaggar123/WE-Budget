
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: String,

    email: {
        type: String,
        unique: true
    },

    password: String,

    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    refreshToken: String,
    verificationToken: String,

    monthlyIncome: Number,

    riskProfile: {
        type: String,
        enum: ["Low", "Medium", "High"]
    }

}, { timestamps: true });

sessions: [
  {
    refreshToken: String,
    device: String,
    ip: String,
    createdAt: { type: Date, default: Date.now }
  }
]
const refreshToken = generateRefreshToken(user);

user.sessions.push({
    refreshToken,
    device: req.headers["user-agent"],
    ip: req.ip
});
user.sessions = user.sessions.filter(
   s => s.refreshToken !== req.cookies.refreshToken
);
await user.save();

await user.save();
router.post("/refresh", async (req, res) => {

    const oldToken = req.cookies.refreshToken;

    const user = await User.findOne({ "sessions.refreshToken": oldToken });
    if (!user) return res.sendStatus(403);

    // ROTATION
    user.sessions = user.sessions.filter(s => s.refreshToken !== oldToken);

    const newRefresh = generateRefreshToken(user);

    user.sessions.push({ refreshToken: newRefresh });
    await user.save();

    const accessToken = generateAccessToken(user);

    res
      .cookie("accessToken", accessToken, { httpOnly: true })
      .cookie("refreshToken", newRefresh, { httpOnly: true })
      .json({ ok: true });
});
module.exports = mongoose.model("User", userSchema);