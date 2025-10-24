import admin from "../config/firebase.js";
const db = admin.database();

// ==================== PLACE BET ====================
export const placeBet = async (userId, marketId, outcome, amount) => {
  try {
    console.log(`🎯 Placing bet:`, { userId, marketId, outcome, amount });
    
    // Get user and market data
    const [userSnap, marketSnap] = await Promise.all([
      db.ref(`users/${userId}`).once('value'),
      db.ref(`markets/${marketId}`).once('value')
    ]);
    
    const user = userSnap.val();
    const market = marketSnap.val();

    // Validations
    if (!user) return { success: false, error: "User not found" };
    if (!market) return { success: false, error: "Market not found" };

    const availableBalance = (user.balance || 0) - (user.lockedBalance || 0);
    if (availableBalance < amount) {
      return { success: false, error: "Insufficient funds" };
    }

    if (market.status !== "active") {
      return { success: false, error: "Market is not active" };
    }

    // Calculate odds
    if (!market.pool) market.pool = { YES: 0, NO: 0 };
    const totalPool = (market.pool.YES || 0) + (market.pool.NO || 0);
    const outcomePool = market.pool[outcome] || 0;
    const probability = totalPool > 0 ? outcomePool / totalPool : 0.5;
    const houseProbability = probability * 1.05;
    const odds = Math.max(1.01, Math.round((1 / (houseProbability || 0.5)) * 100) / 100);

    // Create bet ID
    const betId = `bet_${Date.now()}_${userId}`;

    // ✅ SAFE: Update each path individually instead of using updates object
    const batch = [];
    
    // Update user locked balance
    batch.push(
      db.ref(`users/${userId}/lockedBalance`).set((user.lockedBalance || 0) + amount)
    );
    
    // Update user total wagered
    batch.push(
      db.ref(`users/${userId}/totalWagered`).set((user.totalWagered || 0) + amount)
    );
    
    // Update market pool

// In placeBet, only:
db.ref(`bets/${betId}`).set({...});
db.ref(`users/${userId}/lockedBalance`).set(...);
db.ref(`users/${userId}/totalWagered`).set(...);

// Market pool updated by server/admin only,
    
    // Create bet entry
    batch.push(
      db.ref(`bets/${betId}`).set({
        userId,
        marketId,
        outcome,
        amount,
        odds,
        status: "pending",
        placedAt: Date.now(),
        potentialPayout: Math.round(amount * odds * 100) / 100,
      })
    );

    // Execute all updates
    await Promise.all(batch);

    console.log(`✅ Bet placed successfully: ${betId}`);
    return { success: true, betId };

  } catch (error) {
    console.error("❌ Bet placement error:", error);
    return { success: false, error: error.message };
  }
};

// ==================== GET USER BALANCE ====================
export const getUserBalance = async (userId) => {
  try {
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData) {
      // Create user with default balance if doesn't exist
      const defaultData = {
        balance: 10000,
        lockedBalance: 0,
        totalWagered: 0,
        totalWon: 0,
        createdAt: Date.now(),
      };
      await userRef.set(defaultData);
      return defaultData;
    }

    return {
      balance: userData.balance || 0,
      lockedBalance: userData.lockedBalance || 0,
      availableBalance: (userData.balance || 0) - (userData.lockedBalance || 0),
      totalWagered: userData.totalWagered || 0,
      totalWon: userData.totalWon || 0,
    };
  } catch (error) {
    console.error("Get balance error:", error);
    throw error;
  }
};

// ==================== ADMIN: RESOLVE MARKET ====================
export const resolveMarket = async (adminId, marketId, result) => {
  try {
    // Verify admin
    const adminSnap = await db.ref(`admins/${adminId}`).once('value');
    if (!adminSnap.exists() || adminSnap.val() !== true) {
      throw new Error("Admin access required");
    }

    // Get all pending bets for this market
    const betsSnap = await db.ref("bets").once('value');
    const bets = betsSnap.val();
    const batch = [];

    if (bets) {
      Object.keys(bets).forEach((betId) => {
        const bet = bets[betId];
        if (bet.marketId === marketId && bet.status === "pending") {
          if (bet.outcome === result) {
            // User won
            const payout = bet.amount * bet.odds;
            batch.push(db.ref(`users/${bet.userId}/balance`).set(payout));
            batch.push(db.ref(`users/${bet.userId}/lockedBalance`).set(-bet.amount));
            batch.push(db.ref(`users/${bet.userId}/totalWon`).set(payout - bet.amount));
            batch.push(db.ref(`bets/${betId}/status`).set("won"));
            batch.push(db.ref(`bets/${betId}/payout`).set(payout));
          } else {
            // User lost
            batch.push(db.ref(`users/${bet.userId}/lockedBalance`).set(-bet.amount));
            batch.push(db.ref(`bets/${betId}/status`).set("lost"));
          }
          batch.push(db.ref(`bets/${betId}/resolvedAt`).set(Date.now()));
        }
      });
    }

    // Update market status
    batch.push(db.ref(`markets/${marketId}/status`).set("resolved"));
    batch.push(db.ref(`markets/${marketId}/result`).set(result));
    batch.push(db.ref(`markets/${marketId}/resolvedAt`).set(Date.now()));

    await Promise.all(batch);
    return { success: true, message: "Market resolved successfully" };

  } catch (error) {
    console.error("Market resolution error:", error);
    return { success: false, error: error.message };
  }
};

// ==================== ADMIN: FREEZE/UNFREEZE MARKET ====================
export const setMarketFreeze = async (adminId, marketId, freeze = true) => {
  try {
    // Verify admin
    const adminSnap = await db.ref(`admins/${adminId}`).once('value');
    if (!adminSnap.exists() || adminSnap.val() !== true) {
      throw new Error("Admin access required");
    }

    const newStatus = freeze ? "frozen" : "active";
    await db.ref(`markets/${marketId}`).update({
      status: newStatus,
      frozenAt: freeze ? Date.now() : null,
      unfrozenAt: !freeze ? Date.now() : null,
    });

    return { success: true, message: `Market ${freeze ? "frozen" : "unfrozen"} successfully` };

  } catch (error) {
    console.error("Freeze/unfreeze error:", error);
    return { success: false, error: error.message };
  }
};

// ==================== ADMIN: FREEZE + RESOLVE SHORTCUT ====================
export const freezeAndResolve = async (adminId, marketId, result) => {
  const freezeRes = await setMarketFreeze(adminId, marketId, true);
  if (!freezeRes.success) return freezeRes;
  return await resolveMarket(adminId, marketId, result);
};

// Utility function
const formatVolume = (volume) => {
  if (volume >= 1000000) return (volume / 1000000).toFixed(1) + "M";
  if (volume >= 1000) return (volume / 1000).toFixed(1) + "K";
  return volume.toString();
};

export { formatVolume };
