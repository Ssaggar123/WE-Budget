const mongoose = require("mongoose");

const occasionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  occasionType:    { type: String, required: true },
  totalBudget:     { type: Number, required: true },
  expectedGuests:  { type: Number, default: 0 },
  expenses:        { type: Map, of: Number },
  eventDate:       { type: Date }
}, { timestamps: true });

module.exports = mongoose.model("Occasion", occasionSchema);