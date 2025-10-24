import admin from "../config/firebase.js";
const db = admin.database();

/**
 * ==================== PLACE BET ====================
 * Locks user's funds, creates a bet entry.
 */
export const placeBet = async (userId, marketId, outcome, amount) => {
  try {
    console.log(`🎯 Placing bet:`, { userId, marketId, outcome, amount });

    // Get user and market data
    const [userSnap, marketSnap] = await Promise.all([
      db.ref(`users/${userId}`).once("value"),
      db.ref(`markets/${marketId}`).once("value")
    ]);

    const user = userSnap.val();
    const market = marketSnap.val();

    // --- Validations ---
    if (!user) return { success: false, error: "User not found" };
    if (!market) return { success: false, error: "Market not found" };
    if (market.status !== "active") return { success: false, error: "Market is not active" };

    const availableBalance = (user.balance || 0) - (user.lockedBalance || 0);
    if (availableBalance < amount) return { success: false, error: "Insufficient funds" };

    // --- Calculate odds ---
    if (!market.pool) market.pool = { YES: 0, NO: 0 };
    const totalPool = (market.pool.YES || 0) + (market.pool.NO || 0);
    const outcomePool = market.pool[outcome] || 0;
    const probability = totalPool > 0 ? outcomePool / totalPool : 0.5;
    const houseProbability = Math.min(0.99, probability * 1.05);
    const odds = Math.max(1.01, Math.round((1 / houseProbability) * 100) / 100);

    // --- Create bet ID ---
    const betId = `bet_${Date.now()}_${userId}`;

    // --- Apply updates safely ---
    const updates = {};
    updates[`users/${userId}/lockedBalance`] = (user.lockedBalance || 0) + amount;
    updates[`users/${userId}/totalWagered`] = (user.totalWagered || 0) + amount;
    updates[`bets/${betId}`] = {
      userId,
      marketId,
      outcome,
      amount,
      odds,
      status: "pending",
      placedAt: Date.now(),
      potentialPayout: Math.round(amount * odds * 100) / 100
    };

    await db.ref().update(updates);

    console.log(`✅ Bet placed successfully: ${betId}`);
    return { success: true, betId };
  } catch (error) {
    console.error("❌ Bet placement error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ==================== GET USER BALANCE ====================
 */
export const getUserBalance = async (userId) => {
  try {
    const userRef = db.ref(`users/${userId}`);
    const snapshot = await userRef.once("value");
    const userData = snapshot.val();

    if (!userData) {
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

/**
 * ==================== ADMIN: RESOLVE MARKET ====================
 * Unlocks funds and pays winners.
 */
export const resolveMarket = async (adminId, marketId, result) => {
  try {
    // Verify admin
    const adminSnap = await db.ref(`admins/${adminId}`).once("value");
    if (!adminSnap.exists() || adminSnap.val() !== true) {
      throw new Error("Admin access required");
    }

    const betsSnap = await db.ref("bets").once("value");
    const bets = betsSnap.val();
    const updates = {};

    if (bets) {
      Object.keys(bets).forEach((betId) => {
        const bet = bets[betId];
        if (bet.marketId === marketId && bet.status === "pending") {
          const won = bet.outcome === result;
          const payout = won ? bet.amount * bet.odds : 0;

          // Update user balances safely
          updates[`users/${bet.userId}/lockedBalance`] = admin.database.ServerValue.increment(-bet.amount);
          if (won) {
            updates[`users/${bet.userId}/balance`] = admin.database.ServerValue.increment(payout);
            updates[`users/${bet.userId}/totalWon`] = admin.database.ServerValue.increment(payout - bet.amount);
          }

          // Update bet status
          updates[`bets/${betId}/status`] = won ? "won" : "lost";
          updates[`bets/${betId}/payout`] = payout;
          updates[`bets/${betId}/resolvedAt`] = Date.now();
        }
      });
    }

    updates[`markets/${marketId}/status`] = "resolved";
    updates[`markets/${marketId}/result`] = result;
    updates[`markets/${marketId}/resolvedAt`] = Date.now();

    await db.ref().update(updates);
    console.log(`✅ Market ${marketId} resolved with result: ${result}`);

    return { success: true, message: "Market resolved successfully" };
  } catch (error) {
    console.error("Market resolution error:", error);
    return { success: false, error: error.message };
  }
};

/**
 * ==================== ADMIN: FREEZE/UNFREEZE MARKET ====================
 */
export const setMarketFreeze = async (adminId, marketId, freeze = true) => {
  try {
    const adminSnap = await db.ref(`admins/${adminId}`).once("value");
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

/**
 * ==================== ADMIN: FREEZE + RESOLVE SHORTCUT ====================
 */
export const freezeAndResolve = async (adminId, marketId, result) => {
  const freezeRes = await setMarketFreeze(adminId, marketId, true);
  if (!freezeRes.success) return freezeRes;
  return await resolveMarket(adminId, marketId, result);
};

/**
 * ==================== HELPER: FORMAT VOLUME ====================
 */
export const formatVolume = (volume) => {
  if (volume >= 1000000) return (volume / 1000000).toFixed(1) + "M";
  if (volume >= 1000) return (volume / 1000).toFixed(1) + "K";
  return volume.toString();
};
