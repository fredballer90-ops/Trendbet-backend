"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.resolveMarket = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const adminValidator_1 = require("../utils/adminValidator");
const oddsCalculator_1 = require("../utils/oddsCalculator");
exports.resolveMarket = functions.https.onCall(async (data, context) => {
  // 1. Authentication and admin validation
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Authentication required");
  }
  try {
    await adminValidator_1.AdminValidator.validateAdmin(context.auth.uid);
  } catch (error) {
    throw new functions.https.HttpsError("permission-denied", "Admin access required to resolve markets");
  }
  const {marketId, result} = data;
  console.log(`Market resolution: Admin ${context.auth.uid}, Market ${marketId}, Result ${result}`);
  // 2. Input validation
  if (!marketId || !result) {
    throw new functions.https.HttpsError("invalid-argument", "Missing marketId or result");
  }
  if (!["YES", "NO"].includes(result)) {
    throw new functions.https.HttpsError("invalid-argument", "Result must be YES or NO");
  }
  const db = admin.database();
  try {
    // 3. Get all pending bets for this market
    const betsSnapshot = await db.ref("bets")
        .orderByChild("marketId")
        .equalTo(marketId)
        .once("value");
    const bets = betsSnapshot.val();
    if (!bets) {
      throw new functions.https.HttpsError("not-found", "No bets found for this market");
    }
    const updates = {};
    let resolvedBets = 0;
    // 4. Process each bet
    Object.keys(bets).forEach((betId) => {
      const bet = bets[betId];
      // Only process pending bets
      if (bet.status !== "pending") {
        return;
      }
      const userPath = `users/${bet.userId}`;
      const betPath = `bets/${betId}`;
      if (bet.outcome === result) {
        // WINNER: Calculate payout and update balances
        const payout = oddsCalculator_1.OddsCalculator.calculatePayout(bet.amount, bet.odds);
        // Initialize user data if not exists in updates
        if (!updates[userPath]) {
          updates[userPath] = {};
        }
        // Update user balance (add payout, remove locked amount)
        updates[userPath].balance = admin.database.ServerValue.increment(payout - bet.amount);
        updates[userPath].lockedBalance = admin.database.ServerValue.increment(-bet.amount);
        updates[userPath].totalWon = admin.database.ServerValue.increment(payout - bet.amount);
        // Update bet record
        updates[betPath] = Object.assign(Object.assign({}, bet), {status: "won", payout: payout, resolvedAt: Date.now()});
        console.log(`Winner: User ${bet.userId} wins KSH ${payout} (bet: KSH ${bet.amount})`);
      } else {
        // LOSER: Just unlock the funds and mark as lost
        if (!updates[userPath]) {
          updates[userPath] = {};
        }
        updates[userPath].lockedBalance = admin.database.ServerValue.increment(-bet.amount);
        updates[betPath] = Object.assign(Object.assign({}, bet), {status: "lost", resolvedAt: Date.now()});
        console.log(`Loser: User ${bet.userId} loses KSH ${bet.amount}`);
      }
      resolvedBets++;
    });
    // 5. Update market status
    updates[`markets/${marketId}/status`] = "resolved";
    updates[`markets/${marketId}/result`] = result;
    updates[`markets/${marketId}/resolvedAt`] = Date.now();
    // 6. Execute all updates atomically
    await db.ref().update(updates);
    console.log(`Market ${marketId} resolved as ${result}. Processed ${resolvedBets} bets.`);
    return {
      success: true,
      resolvedBets,
    };
  } catch (error) {
    console.error("Market resolution error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to resolve market: " + error.message);
  }
});
// # sourceMappingURL=resolveMarket.js.map
