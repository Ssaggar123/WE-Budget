const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const OccasionBudget = require("../models/OccasionBudget");

// GET /api/occasions — list all occasion budgets for the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const occasions = await OccasionBudget.find({ user: req.user._id }).sort({ date: 1 });
    res.status(200).json({ success: true, data: occasions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/occasions/:id
router.get("/:id", protect, async (req, res) => {
  try {
    const occasion = await OccasionBudget.findOne({ _id: req.params.id, user: req.user._id });
    if (!occasion) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: occasion });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/occasions — create
router.post("/", protect, async (req, res) => {
  try {
    const { title, occasionType, date, guestCount, categories, notes } = req.body;
    if (!title || !occasionType) {
      return res.status(400).json({ success: false, message: "Title and occasion type are required" });
    }
    const occasion = await OccasionBudget.create({
      user: req.user._id,
      title,
      occasionType,
      date,
      guestCount: guestCount || 0,
      categories: categories || [],
      notes,
    });
    res.status(201).json({ success: true, data: occasion });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/occasions/:id — update
router.put("/:id", protect, async (req, res) => {
  try {
    const occasion = await OccasionBudget.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!occasion) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, data: occasion });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/occasions/:id
router.delete("/:id", protect, async (req, res) => {
  try {
    const occasion = await OccasionBudget.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!occasion) return res.status(404).json({ success: false, message: "Not found" });
    res.status(200).json({ success: true, message: "Deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;