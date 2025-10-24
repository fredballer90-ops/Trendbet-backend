"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.placeBet = void 0;
const functions = require("firebase-functions");
const oddsCalculator_1 = require("../utils/oddsCalculator");
const transactionHandler_1 = require("../utils/transactionHandler");
exports.placeBet = functions.https.onCall(async (data, context) => {
  let _a;
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in to place bets");
  }
  const userId = context.auth.uid;
  const {marketId, outcome, amount} = data;
  console.log(`Bet attempt: User ${userId}, Market ${marketId}, ${outcome}, KSH ${amount}`);
  try {
    // 2. Input validation
    if (!marketId || !outcome || !amount) {
      throw new functions.https.HttpsError("invalid-argument", "Missing required fields: marketId, outcome, amount");
    }
    if (!["YES", "NO"].includes(outcome)) {
      throw new functions.https.HttpsError("invalid-argument", "Outcome must be YES or NO");
    }
    if (typeof amount !== "number" || isNaN(amount)) {
      throw new functions.https.HttpsError("invalid-argument", "Amount must be a valid number");
    }
    // 3. Execute secure transaction
    const result = await transactionHandler_1.TransactionHandler.executeTransaction(async (currentData) => {
      if (!currentData) {
        throw new Error("Database transaction failed");
      }
      // Initialize data structure if not exists
      if (!currentData.users) {
        currentData.users = {};
      }
      if (!currentData.markets) {
        currentData.markets = {};
      }
      if (!currentData.bets) {
        currentData.bets = {};
      }
      const user = currentData.users[userId];
      const market = currentData.markets[marketId];
      // 4. Validate user exists and has sufficient balance
      if (!user) {
        throw new functions.https.HttpsError("not-found", "User account not found");
      }
      transactionHandler_1.TransactionHandler.validateBalance(user, amount);
      // 5. Validate market conditions
      if (!market) {
        throw new functions.https.HttpsError("not-found", "Market not found");
      }
      if (market.status !== "open") {
        throw new functions.https.HttpsError("failed-precondition", "Market is not open for betting");
      }
      // 6. Initialize market pool if not exists
      if (!market.pool) {
        market.pool = {YES: 0, NO: 0};
      }
      // 7. Calculate dynamic odds with house edge
      const odds = oddsCalculator_1.OddsCalculator.calculateOdds(market.pool, outcome);
      const potentialPayout = oddsCalculator_1.OddsCalculator.calculatePayout(amount, odds);
      // 8. Update user balance (lock the funds)
      currentData.users[userId].lockedBalance = (user.lockedBalance || 0) + amount;
      currentData.users[userId].totalWagered = (user.totalWagered || 0) + amount;
      // 9. Update market pool
      currentData.markets[marketId].pool[outcome] = market.pool[outcome] + amount;
      // Update volume display
      const newVolume = market.pool.YES + market.pool.NO + amount;
      currentData.markets[marketId].volume = this.formatVolume(newVolume);
      // 10. Create bet record
      const betId = `bet_${Date.now()}_${userId}`;
      const bet = {
        id: betId,
        userId,
        marketId,
        outcome,
        amount,
        odds,
        status: "pending",
        placedAt: Date.now(),
        potentialPayout,
      };
      currentData.bets[betId] = bet;
      return currentData;
    });
    if (result.committed) {
      console.log(`Bet placed successfully: ${data.outcome} on market ${data.marketId} for KSH ${data.amount}`);
      // Get the odds from the created bet
      const betId = `bet_${Date.now()}_${userId}`;
      const odds = (_a = result.snapshot.val().bets[betId]) === null || _a === void 0 ? void 0 : _a.odds;
      return {
        success: true,
        betId,
        odds: odds || 2.0,
      };
    } else {
      throw new functions.https.HttpsError("aborted", "Bet placement failed");
    }
  } catch (error) {
    console.error("Bet placement error:", error);
    // Convert specific errors to HttpsError
    switch (error.message) {
      case "INSUFFICIENT_FUNDS":
        throw new functions.https.HttpsError("failed-precondition", "Insufficient funds for this bet");
      case "MIN_BET_100":
        throw new functions.https.HttpsError("invalid-argument", "Minimum bet amount is KSH 100");
      case "MAX_BET_100000":
        throw new functions.https.HttpsError("invalid-argument", "Maximum bet amount is KSH 100,000");
      case "USER_NOT_FOUND":
        throw new functions.https.HttpsError("not-found", "User account not found");
      default:
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError("internal", "Failed to place bet: " + error.message);
    }
  }
});
// Helper function to format volume for display
function formatVolume(volume) {
  if (volume >= 1000000) {
    return (volume / 1000000).toFixed(1) + "M";
  } else if (volume >= 1000) {
    return (volume / 1000).toFixed(1) + "K";
  }
  return volume.toString();
}
// # sourceMappingURL=placeBet.js.map
