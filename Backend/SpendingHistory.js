// models/SpendingHistory.js
// No bugs found. Minor note: timestamps:true already adds createdAt/updatedAt
// automatically, so the manual createdAt field creates a duplicate. Removed
// the manual createdAt to let Mongoose handle it cleanly.

const mongoose = require("mongoose");

const spendingSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true  // Added: userId should always be present
        },

        category: String,
        amount:   Number,

        location: String, // Used by geo-velocity check in refreshRoute.js
        device:   String
    },
    {
        timestamps: true // ✅ Handles createdAt + updatedAt automatically
                         // Fix: manual 'createdAt' field was a duplicate
    }
);

module.exports = mongoose.model("SpendingHistory", spendingSchema);