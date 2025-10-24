"use strict";
Object.defineProperty(exports, "__esModule", {value: true});
exports.TransactionHandler = void 0;
const admin = require("firebase-admin");
class TransactionHandler {
  /**
     * Execute a secure database transaction
     */
  static async executeTransaction(transactionFn) {
    return await this.db.ref().transaction(transactionFn);
  }
  /**
     * Update user balance atomically
     */
  static async updateUserBalance(userId, updates) {
    const userRef = this.db.ref(`users/${userId}`);
    await this.executeTransaction(async (currentData) => {
      if (!currentData) {
        throw new Error("TRANSACTION_FAILED");
      }
      const user = currentData.users[userId];
      if (!user) {
        throw new Error("USER_NOT_FOUND");
      }
      // Apply updates
      if (updates.balance !== undefined) {
        currentData.users[userId].balance = updates.balance;
      }
      if (updates.lockedBalance !== undefined) {
        currentData.users[userId].lockedBalance = updates.lockedBalance;
      }
      if (updates.totalWagered !== undefined) {
        currentData.users[userId].totalWagered = updates.totalWagered;
      }
      if (updates.totalWon !== undefined) {
        currentData.users[userId].totalWon = updates.totalWon;
      }
      return currentData;
    });
  }
  /**
     * Validate user has sufficient balance
     */
  static validateBalance(user, amount) {
    const availableBalance = user.balance - (user.lockedBalance || 0);
    if (amount < 100) {
      throw new Error("MIN_BET_100");
    }
    if (amount > 100000) {
      throw new Error("MAX_BET_100000");
    }
    if (availableBalance < amount) {
      throw new Error("INSUFFICIENT_FUNDS");
    }
  }
}
exports.TransactionHandler = TransactionHandler;
TransactionHandler.db = admin.database();
// # sourceMappingURL=transactionHandler.js.map
