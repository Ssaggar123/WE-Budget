const express = require("express");
const router = express.Router();
const { scanReceipt } = require("../controllers/ocrController");
const { protect } = require("../middleware/authMiddleware");

router.post("/scan", protect, scanReceipt);

module.exports = router;