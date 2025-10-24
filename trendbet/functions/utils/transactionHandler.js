const admin = require('firebase-admin');

class TransactionHandler {
  static db = admin.database();

  /**
   * Execute a secure database transaction
   */
  static async executeTransaction(transactionFn) {
    return await this.db.ref().transaction(transactionFn);
  }

  /**
   * Validate user has sufficient balance
   */
  static validateBalance(user, amount) {
    const availableBalance = user.balance - (user.lockedBalance || 0);
    
    if (amount < 100) {
      throw new Error('MIN_BET_100');
    }
    
    if (amount > 100000) {
      throw new Error('MAX_BET_100000');
    }
    
    if (availableBalance < amount) {
      throw new Error('INSUFFICIENT_FUNDS');
    }
  }

  /**
   * Format volume for display
   */
  static formatVolume(volume) {
    if (volume >= 1000000) {
      return (volume / 1000000).toFixed(1) + 'M';
    } else if (volume >= 1000) {
      return (volume / 1000).toFixed(1) + 'K';
    }
    return volume.toString();
  }
}

module.exports = { TransactionHandler };
