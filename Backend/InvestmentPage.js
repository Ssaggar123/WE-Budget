const express = require("express");
const Investment = require("../models/Investment");
const User = require("../models/User");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/recommend", auth, async (req, res) => {

    const user = await User.findById(req.user.id);

    const schemes = await Investment.find({
        riskLevel: user.riskProfile
    });

    res.json({ recommendedSchemes: schemes });
});

module.exports = router;
