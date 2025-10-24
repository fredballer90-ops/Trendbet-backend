import admin from "../config/firebase.js";
const db = admin.database();

// ==================== PLACE BET ====================
export const placeBet = async (userId, marketId, outcome, amount) => {
  try {
    console.log(`🎯 Placing bet: user=${userId}, market=${marketId}, outcome=${outcome}, amount=${amount}`);
    
    // Get user and market data first
    const [userSnap, marketSnap] = await Promise.all([
      db.ref(`users/${userId}`).once('value'),
      db.ref(`markets/${marketId}`).once('value')
    ]);
    
    const user = userSnap.val();
    const market = marketSnap.val();

    // Validations
    if (!user) {
      return {success: false, error: "User not found"};
    }

    const availableBalance = (user.balance || 0) - (user.lockedBalance || 0);
    if (availableBalance < amount) {
      return {success: false, error: "Insufficient funds. Available: KSH " + availableBalance};
    }

    if (!market) {
      return {success: false, error: "Market not found"};
    }

    if (market.status === "frozen") {
      return {success: false, error: "Market temporarily frozen — betting paused"};
    }

    if (market.status !== "active" && market.status !== "open") {
      return {success: false, error: "Market is not available for betting"};
    }

    // Calculate odds
    if (!market.pool) market.pool = {YES: 0, NO: 0};
    const totalPool = (market.pool.YES || 0) + (market.pool.NO || 0);
    const outcomePool = market.pool[outcome] || 0;
    const probability = totalPool > 0 ? outcomePool / totalPool : 0.5;
    const houseProbability = probability * 1.05;
    const odds = Math.max(1.01, Math.round((1 / (houseProbability || 0.5)) * 100) / 100);

    // Create bet
    const betId = `bet_${Date.now()}_${userId}`;
    
    // ✅ SAFE: Use specific paths for updates - NO ROOT REFERENCES!
    const updates = {};
    
    // Update user
    updates[`users/${userId}/lockedBalance`] = (user.lockedBalance || 0) + amount;
    updates[`users/${userId}/totalWagered`] = (user.totalWagered || 0) + amount;
    
    // Update market pool
    updates[`markets/${marketId}/pool/${outcome}`] = (market.pool[outcome] || 0) + amount;
    
    // Update volume display
    const newVolume = (market.pool.YES || 0) + (market.pool.NO || 0) + amount;
    updates[`markets/${marketId}/volume`] = formatVolume(newVolume);
    
    // Create bet entry
    updates[`bets/${betId}`] = {
      userId,
      marketId,
      outcome,
      amount,
      odds,
      status: "pending",
      placedAt: Date.now(),
      potentialPayout: Math.round(amount * odds * 100) / 100,
    };

    // ✅ SAFE: Apply updates using the same updates object
    await db.ref().update(updates);
    
    console.log(`✅ Bet placed successfully: ${betId}`);
    return {success: true, betId: betId};

  } catch (error) {
    console.error("Bet placement error:", error);
    return {success: false, error: error.message || String(error)};
  }
};

// ==================== UTILITIES ====================
const formatVolume = (volume) => {
  if (volume >= 1000000) return (volume / 1000000).toFixed(1) + "M";
  if (volume >= 1000) return (volume / 1000).toFixed(1) + "K";
  return volume.toString();
};

// ==================== GET USER BALANCE ====================
export const getUserBalance = async (userId) => {
  try {
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.get();
    const userData = snapshot.val();

    if (!userData) {
      const defaultData = {
        balance: 10000,
        lockedBalance: 0,
        totalWagered: 0,
        totalWon: 0,
        createdAt: Date.now(),
      };
      await userRef.update(defaultData);
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
    const adminRef = db.ref(`admins/${adminId}`);
    const adminSnapshot = await adminRef.get();
    if (!adminSnapshot.exists() || adminSnapshot.val() !== true) {
      throw new Error("Admin access required");
    }

    const betsRef = db.ref("bets");
    const betsSnapshot = await betsRef.get();
    const bets = betsSnapshot.val();
    const updates = {};

    if (bets) {
      Object.keys(bets).forEach((betId) => {
        const bet = bets[betId];
        if (bet.marketId === marketId && bet.status === "pending") {
          const userPath = `users/${bet.userId}`;
          if (bet.outcome === result) {
            const payout = bet.amount * bet.odds;
            updates[`${userPath}/balance`] = payout;
            updates[`${userPath}/lockedBalance`] = -bet.amount;
            updates[`${userPath}/totalWon`] = payout - bet.amount;
            updates[`bets/${betId}/status`] = "won";
            updates[`bets/${betId}/payout`] = payout;
          } else {
            updates[`${userPath}/lockedBalance`] = -bet.amount;
            updates[`bets/${betId}/status`] = "lost";
          }
          updates[`bets/${betId}/resolvedAt`] = Date.now();
        }
      });
    }

    updates[`markets/${marketId}/status`] = "resolved";
    updates[`markets/${marketId}/result`] = result;
    updates[`markets/${marketId}/resolvedAt`] = Date.now();

    // ✅ SAFE: This is actually fine since updates object has specific paths
    await db.ref().update(updates);
    return {success: true, message: "Market resolved successfully"};
  } catch (error) {
    console.error("Market resolution error:", error);
    return {success: false, error: error.message || String(error)};
  }
};

// ==================== ADMIN: FREEZE/UNFREEZE MARKET ====================
export const setMarketFreeze = async (adminId, marketId, freeze = true) => {
  try {
    if (!adminId || !marketId) throw new Error("Missing parameters");

    const adminSnap = await db.ref(`admins/${adminId}`).get();
    if (!adminSnap.exists() || adminSnap.val() !== true) {
      throw new Error("Admin access required");
    }

    const marketRef = db.ref(`markets/${marketId}`);
    const snap = await marketRef.get();
    if (!snap.exists()) throw new Error("Market not found");

    const newStatus = freeze ? "frozen" : "active";
    await marketRef.update({
      status: newStatus,
      frozenAt: freeze ? Date.now() : null,
      unfrozenAt: !freeze ? Date.now() : null,
    });

    return {success: true, message: `Market ${freeze ? "frozen" : "unfrozen"} successfully`};
  } catch (error) {
    console.error("Freeze/unfreeze error:", error);
    return {success: false, error: error.message || String(error)};
  }
};

// ==================== ADMIN: FREEZE + RESOLVE SHORTCUT ====================
export const freezeAndResolve = async (adminId, marketId, result) => {
  const freezeRes = await setMarketFreeze(adminId, marketId, true);
  if (!freezeRes.success) return freezeRes;
  return await resolveMarket(adminId, marketId, result);
};

// Export formatVolume if needed elsewhere
export { formatVolume };
