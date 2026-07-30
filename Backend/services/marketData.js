const axios = require("axios");

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_KEY;
const ALPHA_BASE = "https://www.alphavantage.co/query";

// In-memory cache — Alpha Vantage free tier allows only 25 requests/day,
// so we cache aggressively and serve stale data rather than re-fetching every request.
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
const cache = {
  stocks: { data: null, ts: 0 },
  mutualFunds: { data: null, ts: 0 },
};

// Alpha Vantage has no "browse all stocks" endpoint on the free tier,
// so we track a fixed watchlist and fetch a quote for each symbol.
// .BSE suffix = Bombay Stock Exchange listings.
const STOCK_WATCHLIST = [
  { symbol: "RELIANCE.BSE", name: "Reliance Industries" },
  { symbol: "TCS.BSE", name: "Tata Consultancy Services" },
  { symbol: "INFY.BSE", name: "Infosys" },
  { symbol: "HDFCBANK.BSE", name: "HDFC Bank" },
  { symbol: "ICICIBANK.BSE", name: "ICICI Bank" },
];

async function fetchStockQuote(symbol) {
  const res = await axios.get(ALPHA_BASE, {
    params: { function: "GLOBAL_QUOTE", symbol, apikey: ALPHA_VANTAGE_KEY },
    timeout: 8000,
  });
  const q = res.data["Global Quote"];
  if (!q || !q["05. price"]) return null;
  return {
    price: parseFloat(q["05. price"]),
    change: parseFloat(q["09. change"]),
    changePercent: q["10. change percent"],
  };
}

async function getStockWatchlist() {
  const now = Date.now();
  if (cache.stocks.data && now - cache.stocks.ts < CACHE_TTL) {
    return { data: cache.stocks.data, cached: true };
  }

  const results = [];
  for (const stock of STOCK_WATCHLIST) {
    try {
      const quote = await fetchStockQuote(stock.symbol);
      if (quote) {
        results.push({ ...stock, ...quote, riskLevel: "High", category: "Stock" });
      }
      // Stay under Alpha Vantage's 5 requests/minute limit
      await new Promise((r) => setTimeout(r, 800));
    } catch (err) {
      console.error(`Failed to fetch quote for ${stock.symbol}:`, err.message);
    }
  }

  // If everything failed (e.g. daily quota hit), fall back to last known cache
  if (results.length === 0 && cache.stocks.data) {
    return { data: cache.stocks.data, cached: true, stale: true };
  }

  cache.stocks = { data: results, ts: now };
  return { data: results, cached: false };
}

// Mutual fund NAVs via mfapi.in — free, no API key, updated daily by AMFI
const MF_WATCHLIST = [
  { code: "120503", name: "SBI Bluechip Fund" },
  { code: "119551", name: "HDFC Mid-Cap Opportunities Fund" },
  { code: "125497", name: "Axis Long Term Equity Fund" },
  { code: "118989", name: "ICICI Prudential Technology Fund" },
];

async function getMutualFundNavs() {
  const now = Date.now();
  if (cache.mutualFunds.data && now - cache.mutualFunds.ts < CACHE_TTL) {
    return { data: cache.mutualFunds.data, cached: true };
  }

  const results = await Promise.all(
    MF_WATCHLIST.map(async (fund) => {
      try {
        const res = await axios.get(`https://api.mfapi.in/mf/${fund.code}`, { timeout: 8000 });
        const latest = res.data?.data?.[0];
        return {
          ...fund,
          nav: latest ? parseFloat(latest.nav) : null,
          navDate: latest?.date || null,
          riskLevel: "Medium",
          category: "MutualFund",
        };
      } catch (err) {
        console.error(`Failed to fetch NAV for ${fund.code}:`, err.message);
        return { ...fund, nav: null, navDate: null, riskLevel: "Medium", category: "MutualFund" };
      }
    })
  );

  cache.mutualFunds = { data: results, ts: now };
  return { data: results, cached: false };
}

module.exports = { getStockWatchlist, getMutualFundNavs };