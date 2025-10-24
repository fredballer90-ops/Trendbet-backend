"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.getMarketOdds = exports.getUserBalance = exports.resolveMarket = exports.placeBet = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
// Import handlers
const placeBet_1 = require("./betHandlers/placeBet");
const resolveMarket_1 = require("./betHandlers/resolveMarket");
const getUserBalance_1 = require("./userHandlers/getUserBalance");
// Export Cloud Functions
exports.placeBet = exports.placeBet;
exports.resolveMarket = exports.resolveMarket;
exports.getUserBalance = exports.getUserBalance;
// Optional: HTTP endpoints for additional functionality
exports.getMarketOdds = functions.https.onRequest(async (req, res) => {
  // Add CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "GET");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }
  try {
    const {marketId} = req.query;
    if (!marketId || typeof marketId !== "string") {
      res.status(400).json({error: "Market ID is required"});
      return;
    }
    const db = admin.database();
    const marketSnapshot = await db.ref(`markets/${marketId}`).once("value");
    const market = marketSnapshot.val();
    if (!market) {
      res.status(404).json({error: "Market not found"});
      return;
    }
    const pool = market.pool || {YES: 0, NO: 0};
    res.json({
      marketId,
      pool,
      probabilities: {
        YES: Math.round((pool.YES / (pool.YES + pool.NO || 1)) * 100),
        NO: Math.round((pool.NO / (pool.YES + pool.NO || 1)) * 100),
      },
    });
  } catch (error) {
    console.error("Error getting market odds:", error);
    res.status(500).json({error: "Internal server error"});
  }
});
// # sourceMappingURL=index.js.map
