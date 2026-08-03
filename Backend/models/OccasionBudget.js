const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const occasionBudgetSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    occasionType: {
      type: String,
      enum: [
        "Birthday Party",
        "Family Gathering",
        "Wedding",
        "Engagement",
        "Family Trip",
        "Official Trip",
        "Festival",
        "Other",
      ],
      required: true,
    },
    date: { type: Date },
    guestCount: { type: Number, default: 0 },
    categories: [categorySchema],
    notes: { type: String },
  },
  { timestamps: true }
);

occasionBudgetSchema.virtual("totalBudget").get(function () {
  return this.categories.reduce((sum, c) => sum + (c.amount || 0), 0);
});

occasionBudgetSchema.virtual("perHeadCost").get(function () {
  const total = this.categories.reduce((sum, c) => sum + (c.amount || 0), 0);
  return this.guestCount > 0 ? total / this.guestCount : 0;
});

occasionBudgetSchema.set("toJSON", { virtuals: true });
occasionBudgetSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("OccasionBudget", occasionBudgetSchema);