const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const Occasion = require("../models/Occasion");

router.post("/create-occasion", auth, async (req, res) => {
  try {
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
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/list", auth, async (req, res) => {
  try {
    const occasions = await Occasion.find({ userId: req.user.id });
    res.json({ occasions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;