const axios = require("axios");

// ── Known merchant → category map ──────────────────────────────────
// Extend this list over time with vendors you commonly see
const MERCHANT_CATEGORY_MAP = [
  { keywords: ["swiggy", "zomato", "dominos", "mcdonald", "kfc", "pizza", "restaurant", "cafe", "starbucks"], category: "Food" },
  { keywords: ["big bazaar", "dmart", "grocery", "supermarket", "reliance fresh", "more retail", "spencer"], category: "Food" },
  { keywords: ["uber", "ola", "rapido", "petrol", "fuel", "hpcl", "bpcl", "iocl", "shell", "indian oil"], category: "Transport" },
  { keywords: ["apollo", "pharmacy", "medplus", "hospital", "clinic", "diagnostic", "medical"], category: "Health" },
  { keywords: ["netflix", "spotify", "hotstar", "prime video", "bookmyshow", "pvr", "inox"], category: "Entertainment" },
  { keywords: ["electricity", "water bill", "broadband", "wifi", "gas bill", "maintenance"], category: "Housing" },
];

const guessCategory = (text) => {
  const lower = text.toLowerCase();
  for (const entry of MERCHANT_CATEGORY_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.category;
    }
  }
  return "Misc";
};

// ── Extract the most likely total amount from OCR text ─────────────
const extractAmount = (text) => {
  const lines = text.split("\n");

  // ── Priority 1: currency-symbol-prefixed amount (₹, Rs, INR, or OCR's "R" misread) ─
  // Matches patterns like "₹11,919", "Rs.11,919", "R11,919"
  const currencyPattern = /(?:₹|rs\.?|inr|r)\s?([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i;

  for (const line of lines) {
    const match = line.match(currencyPattern);
    if (match) {
      const val = parseFloat(match[1].replace(/,/g, ""));
      if (!isNaN(val) && val > 0 && val < 10000000) {
        return val;
      }
    }
  }

  // ── Priority 2: lines explicitly labeled total/amount/paid ─────────
  const priorityKeywords = ["grand total", "net payable", "total amount", "amount due", "amount paid", "total"];
  const numberPattern = /([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)/;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (priorityKeywords.some((kw) => lower.includes(kw))) {
      const match = line.match(numberPattern);
      if (match) {
        const val = parseFloat(match[1].replace(/,/g, ""));
        if (!isNaN(val) && val > 0) return val;
      }
    }
  }

  // ── Priority 3: fallback — largest number, EXCLUDING ID/code-like lines ─
  const excludeKeywords = [
    "auth", "code", "rrn", "serial", "mid", "aid", "tid",
    "card no", "bank", "acquiring", "app label", "transaction type",
    "batch", "terminal", "invoice no", "ref no", "id", "gstin",
  ];

  const candidateLines = lines.filter((line) => {
    const lower = line.toLowerCase();
    return !excludeKeywords.some((kw) => lower.includes(kw));
  });

  const allNumbers = candidateLines
    .join(" ")
    .match(/([0-9]+(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)/g);

  if (allNumbers) {
    const parsed = allNumbers
      .map((n) => parseFloat(n.replace(/,/g, "")))
      .filter((n) => !isNaN(n) && n > 0 && n < 1000000);
    if (parsed.length > 0) {

      return Math.max(...parsed);
    }
  }

  return null;
};
// ── Extract a likely merchant name (usually near the top of receipt) ─
const extractMerchant = (text) => {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 40);

  const skipPattern = /^\d|www\.|@|phone|tel|gstin|invoice|receipt|date|\d{2}[\/\-]\d{2}/i;

  for (const line of lines.slice(0, 6)) {
    if (!skipPattern.test(line)) {
      return line;
    }
  }

  return lines[0] || "";
};

// ── POST /api/ocr/scan ──────────────────────────────────────────────
const scanReceipt = async (req, res) => {
  try {
    const { base64Image } = req.body;

    if (!base64Image) {
      return res.status(400).json({
        success: false,
        message: "No image provided",
      });
    }

    const ocrResponse = await axios.post(
      "https://api.ocr.space/parse/image",
      new URLSearchParams({
        apikey: process.env.OCR_API_KEY,
        base64Image: base64Image.startsWith("data:")
          ? base64Image
          : `data:image/jpeg;base64,${base64Image}`,
        OCREngine: "2",
        scale: "true",
        detectOrientation: "true",
      }),
      {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 20000,
      }
    );

    const result = ocrResponse.data;

    if (result.IsErroredOnProcessing) {
      return res.status(422).json({
        success: false,
        message: result.ErrorMessage?.[0] || "Could not read the receipt. Try a clearer photo.",
      });
    }

    const parsedText = result.ParsedResults?.[0]?.ParsedText || "";


    if (!parsedText.trim()) {
      return res.status(422).json({
        success: false,
        message: "No text detected. Try a clearer, well-lit photo.",
      });
    }

    const amount = extractAmount(parsedText);
    const merchant = extractMerchant(parsedText);
    const category = guessCategory(parsedText);

    res.status(200).json({
      success: true,
      data: {
        amount: amount || "",
        description: merchant || "",
        category,
        rawText: parsedText,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to scan receipt",
      error: error.message,
    });
  }
};

module.exports = { scanReceipt };