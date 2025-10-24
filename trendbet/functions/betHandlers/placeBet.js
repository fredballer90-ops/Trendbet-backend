const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { OddsCalculator } = require('../utils/oddsCalculator');
const { TransactionHandler } = require('../utils/transactionHandler');

const placeBet = functions.https.onCall(async (data, context) => {
  // 1. Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in to place bets');
  }

  const userId = context.auth.uid;
  const { marketId, outcome, amount } = data;

  console.log(`Bet attempt: User ${userId}, Market ${marketId}, ${outcome}, KSH ${amount}`);

  try {
    // 2. Input validation
    if (!marketId || !outcome || !amount) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: marketId, outcome, amount');
    }

    if (!['YES', 'NO'].includes(outcome)) {
      throw new functions.https.HttpsError('invalid-argument', 'Outcome must be YES or NO');
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new functions.https.HttpsError('invalid-argument', 'Amount must be a valid number');
    }

    // 3. Execute secure transaction
    const result = await TransactionHandler.executeTransaction(async (currentData) => {
      if (!currentData) {
        throw new Error('Database transaction failed');
      }

      // Initialize data structure if not exists
      if (!currentData.users) currentData.users = {};
      if (!currentData.markets) currentData.markets = {};
      if (!currentData.bets) currentData.bets = {};

      const user = currentData.users[userId];
      const market = currentData.markets[marketId];

      // 4. Validate user exists and has sufficient balance
      if (!user) {
        throw new functions.https.HttpsError('not-found', 'User account not found');
      }

      TransactionHandler.validateBalance(user, amount);

      // 5. Validate market conditions
      if (!market) {
        throw new functions.https.HttpsError('not-found', 'Market not found');
      }

      if (market.status !== 'open') {
        throw new functions.https.HttpsError('failed-precondition', 'Market is not open for betting');
      }

      // 6. Initialize market pool if not exists
      if (!market.pool) {
        market.pool = { YES: 0, NO: 0 };
      }

      // 7. Calculate dynamic odds with house edge
      const odds = OddsCalculator.calculateOdds(market.pool, outcome);
      const potentialPayout = OddsCalculator.calculatePayout(amount, odds);

      // 8. Update user balance (lock the funds)
      currentData.users[userId].lockedBalance = (user.lockedBalance || 0) + amount;
      currentData.users[userId].totalWagered = (user.totalWagered || 0) + amount;

      // 9. Update market pool
      currentData.markets[marketId].pool[outcome] = market.pool[outcome] + amount;

      // Update volume display
      const newVolume = market.pool.YES + market.pool.NO + amount;
      currentData.markets[marketId].volume = TransactionHandler.formatVolume(newVolume);

      // 10. Create bet record
      const betId = `bet_${Date.now()}_${userId}`;
      const bet = {
        id: betId,
        userId,
        marketId,
        outcome,
        amount,
        odds,
        status: 'pending',
        placedAt: Date.now(),
        potentialPayout
      };

      currentData.bets[betId] = bet;

      return currentData;
    });

    if (result.committed) {
      console.log(`Bet placed successfully: ${outcome} on market ${marketId} for KSH ${amount}`);
      
      // Get the odds from the created bet
      const betId = `bet_${Date.now()}_${userId}`;
      const odds = result.snapshot.val().bets[betId]?.odds;
      
      return {
        success: true,
        betId,
        odds: odds || 2.0
      };
    } else {
      throw new functions.https.HttpsError('aborted', 'Bet placement failed');
    }

  } catch (error) {
    console.error('Bet placement error:', error);

    // Convert specific errors to HttpsError
    switch (error.message) {
      case 'INSUFFICIENT_FUNDS':
        throw new functions.https.HttpsError('failed-precondition', 'Insufficient funds for this bet');
      case 'MIN_BET_100':
        throw new functions.https.HttpsError('invalid-argument', 'Minimum bet amount is KSH 100');
      case 'MAX_BET_100000':
        throw new functions.https.HttpsError('invalid-argument', 'Maximum bet amount is KSH 100,000');
      case 'USER_NOT_FOUND':
        throw new functions.https.HttpsError('not-found', 'User account not found');
      default:
        if (error.code && error.code.startsWith('functions/')) {
          throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to place bet: ' + error.message);
    }
  }
});

module.exports = { placeBet };
