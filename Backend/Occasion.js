const express = require("express");
const Occasion = require("../models/Occasion");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/create-occasion", auth, async (req, res) => {

    const { occasionType, totalBudget, expectedGuests, expenses, eventDate } = req.body;

    const occasion = new Occasion({
        userId: req.user.id,
        occasionType,
        totalBudget,
        expectedGuests,
        expenses,
        eventDate
    });

    await occasion.save();

    res.json({ message: "Occasion Plan Created", occasion });
});

module.exports = router;
