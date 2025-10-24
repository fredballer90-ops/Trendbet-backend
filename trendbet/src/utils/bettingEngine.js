import { ref, runTransaction } from 'firebase/database';
import { db } from '../firebase';

export const placeBet = async (userId, marketId, outcome, amount) => {
  try {
    const result = await runTransaction(ref(db), async (currentData) => {
      if (!currentData) {
        throw new Error('Transaction failed: No data');
      }

      // Initialize data structure if needed
      if (!currentData.users) currentData.users = {};
      if (!currentData.markets) currentData.markets = {};
      if (!currentData.bets) currentData.bets = {};

      const user = currentData.users[userId];
      const market = currentData.markets[marketId];

      // Validate user exists and has data structure
      if (!user) {
        // Initialize user with default balance
        currentData.users[userId] = {
          balance: 10000,
          lockedBalance: 0,
          totalWagered: 0,
          totalWon: 0,
          createdAt: Date.now()
        };
      }

      const currentUser = currentData.users[userId];

      // Validate sufficient balance
      const availableBalance = (currentUser.balance || 0) - (currentUser.lockedBalance || 0);
      if (availableBalance < amount) {
        throw new Error('Insufficient funds. Available: KSH ' + availableBalance);
      }

      // Validate market exists and is open
      if (!market) {
        throw new Error('Market not found');
      }

      if (market.status !== 'open') {
        throw new Error('Market is not available for betting');
      }

      // Initialize market pool if needed
      if (!market.pool) {
        market.pool = { YES: 0, NO: 0 };
      }

      // Calculate odds with 5% house edge
      const totalPool = (market.pool.YES || 0) + (market.pool.NO || 0);
      const outcomePool = market.pool[outcome] || 0;
      const probability = totalPool > 0 ? outcomePool / totalPool : 0.5;
      const houseProbability = probability * 1.05; // 5% house edge
      const odds = Math.max(1.01, Math.round((1 / (houseProbability || 0.5)) * 100) / 100);

      // Update user balance (lock the funds)
      currentData.users[userId].lockedBalance = (currentUser.lockedBalance || 0) + amount;
      currentData.users[userId].totalWagered = (currentUser.totalWagered || 0) + amount;

      // Update market pool
      currentData.markets[marketId].pool[outcome] = (market.pool[outcome] || 0) + amount;

      // Update volume display
      const newVolume = (market.pool.YES || 0) + (market.pool.NO || 0) + amount;
      currentData.markets[marketId].volume = formatVolume(newVolume);

      // Create bet record
      const betId = `bet_${Date.now()}_${userId}`;
      currentData.bets[betId] = {
        userId,
        marketId,
        outcome,
        amount,
        odds,
        status: 'pending',
        placedAt: Date.now(),
        potentialPayout: Math.round(amount * odds * 100) / 100
      };

      return currentData;
    });

    return { 
      success: true, 
      betId: `bet_${Date.now()}_${userId}`, 
      transaction: result 
    };
  } catch (error) {
    console.error('Bet placement error:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Format volume for display
const formatVolume = (volume) => {
  if (volume >= 1000000) return (volume / 1000000).toFixed(1) + 'M';
  if (volume >= 1000) return (volume / 1000).toFixed(1) + 'K';
  return volume.toString();
};

// Get user balance
export const getUserBalance = async (userId) => {
  try {
    const userRef = ref(db, `users/${userId}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();

    if (!userData) {
      // Initialize user with default balance
      const defaultData = {
        balance: 10000,
        lockedBalance: 0,
        totalWagered: 0,
        totalWon: 0,
        createdAt: Date.now()
      };
      await userRef.set(defaultData);
      return defaultData;
    }

    return {
      balance: userData.balance || 0,
      lockedBalance: userData.lockedBalance || 0,
      availableBalance: (userData.balance || 0) - (userData.lockedBalance || 0),
      totalWagered: userData.totalWagered || 0,
      totalWon: userData.totalWon || 0
    };
  } catch (error) {
    console.error('Get balance error:', error);
    throw error;
  }
};

// Resolve market (admin only)
export const resolveMarket = async (adminId, marketId, result) => {
  try {
    // First verify admin privileges
    const adminRef = ref(db, `admins/${adminId}`);
    const adminSnapshot = await adminRef.get();
    
    if (!adminSnapshot.exists() || adminSnapshot.val() !== true) {
      throw new Error('Admin access required');
    }

    // Get all pending bets for this market
    const betsRef = ref(db, 'bets');
    const betsSnapshot = await betsRef.get();
    const bets = betsSnapshot.val();

    const updates = {};

    if (bets) {
      Object.keys(bets).forEach(betId => {
        const bet = bets[betId];
        if (bet.marketId === marketId && bet.status === 'pending') {
          const userPath = `users/${bet.userId}`;
          
          if (bet.outcome === result) {
            // Winner
            const payout = bet.amount * bet.odds;
            updates[`${userPath}/balance`] = payout; // Add winnings
            updates[`${userPath}/lockedBalance`] = -bet.amount; // Unlock original amount
            updates[`${userPath}/totalWon`] = payout - bet.amount; // Add net winnings
            updates[`bets/${betId}/status`] = 'won';
            updates[`bets/${betId}/payout`] = payout;
          } else {
            // Loser - just unlock the funds
            updates[`${userPath}/lockedBalance`] = -bet.amount;
            updates[`bets/${betId}/status`] = 'lost';
          }
          updates[`bets/${betId}/resolvedAt`] = Date.now();
        }
      });
    }

    // Update market status
    updates[`markets/${marketId}/status`] = 'resolved';
    updates[`markets/${marketId}/result`] = result;
    updates[`markets/${marketId}/resolvedAt`] = Date.now();

    // Apply all updates
    const updateRef = ref(db);
    await updateRef.update(updates);

    return { success: true, message: 'Market resolved successfully' };
  } catch (error) {
    console.error('Market resolution error:', error);
    return { success: false, error: error.message };
  }
};
