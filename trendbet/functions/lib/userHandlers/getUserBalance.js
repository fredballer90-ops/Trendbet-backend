"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.getUserBalance = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
exports.getUserBalance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be logged in");
  }
  const userId = context.auth.uid;
  const db = admin.database();
  try {
    const userSnapshot = await db.ref(`users/${userId}`).once("value");
    const userData = userSnapshot.val();
    if (!userData) {
      // Initialize user with default balance if not exists
      const defaultUserData = {
        balance: 10000,
        lockedBalance: 0,
        totalWagered: 0,
        totalWon: 0,
        createdAt: Date.now(),
      };
      await db.ref(`users/${userId}`).set(defaultUserData);
      return {
        balance: defaultUserData.balance,
        lockedBalance: defaultUserData.lockedBalance,
        availableBalance: defaultUserData.balance,
        totalWagered: defaultUserData.totalWagered,
        totalWon: defaultUserData.totalWon,
      };
    }
    const availableBalance = userData.balance - (userData.lockedBalance || 0);
    return {
      balance: userData.balance || 0,
      lockedBalance: userData.lockedBalance || 0,
      availableBalance,
      totalWagered: userData.totalWagered || 0,
      totalWon: userData.totalWon || 0,
    };
  } catch (error) {
    console.error("Error fetching user balance:", error);
    throw new functions.https.HttpsError("internal", "Failed to fetch user balance");
  }
});
// # sourceMappingURL=getUserBalance.js.map
