// functions/utils/bettingEngine.js
// Converted for use with Firebase Admin SDK (Node / Cloud Functions).
// All original logic preserved; adapted from client-side RTDB calls to admin.database() transactions.

const admin = require("firebase-admin");
const db = admin.database();

// ==================== PLACE BET ====================
const placeBet = async (userId, marketId, outcome, amount) => {
  try {
    let abortReason = null;
    const result = await db.ref().transaction((currentData) => {
      try {
        if (!currentData) {
          abortReason = "Transaction failed: No data";
          return; // abort
        }
        if (!currentData.users) currentData.users = {};
        if (!currentData.markets) currentData.markets = {};
        if (!currentData.bets) currentData.bets = {};

        const user = currentData.users[userId];
        const market = currentData.markets[marketId];

        if (!user) {
          currentData.users[userId] = {
            balance: 10000,
            lockedBalance: 0,
            totalWagered: 0,
            totalWon: 0,
            createdAt: Date.now(),
          };
        }

        const currentUser = currentData.users[userId];
        const availableBalance = (currentUser.balance || 0) - (currentUser.lockedBalance || 0);
        if (availableBalance < amount) {
          abortReason = "Insufficient funds. Available: KSH " + availableBalance;
          return; // abort
        }

        if (!market) {
          abortReason = "Market not found";
          return;
        }
        if (market.status === "frozen") {
          abortReason = "Market temporarily frozen — betting paused";
          return;
        }
        if (market.status !== "open") {
          abortReason = "Market is not available for betting";
          return;
        }

        if (!market.pool) market.pool = {YES: 0, NO: 0};

        const totalPool = (market.pool.YES || 0) + (market.pool.NO || 0);
        const outcomePool = market.pool[outcome] || 0;
        const probability = totalPool > 0 ? outcomePool / totalPool : 0.5;
        const houseProbability = probability * 1.05;
        const odds = Math.max(1.01, Math.round((1 / (houseProbability || 0.5)) * 100) / 100);

        // update user locked balance and wager totals
        currentData.users[userId].lockedBalance = (currentUser.lockedBalance || 0) + amount;
        currentData.users[userId].totalWagered = (currentUser.totalWagered || 0) + amount;

        // update market pool
        currentData.markets[marketId].pool[outcome] = (market.pool[outcome] || 0) + amount;

        // update volume display (string formatted)
        const newVolume = (market.pool.YES || 0) + (market.pool.NO || 0) + amount;
        currentData.markets[marketId].volume = formatVolume(newVolume);

        const betId = `bet_${Date.now()}_${userId}`;
        currentData.bets[betId] = {
          userId,
          marketId,
          outcome,
          amount,
          odds,
          status: "pending",
          placedAt: Date.now(),
          potentialPayout: Math.round(amount * odds * 100) / 100,
        };

        return currentData;
      } catch (err) {
        // If an unexpected error happens inside transaction, abort with message
        abortReason = err && err.message ? err.message : "Transaction internal error";
        return;
      }
    });

    // result is an object with { committed, snapshot }
    if (!result || !result.committed) {
      const errMsg = abortReason || "Transaction aborted";
      return {success: false, error: errMsg};
    }

    // We return a generated betId (note: exact betId used in transaction is timestamp-based; recreate similarly)
    return {success: true, betId: `bet_${Date.now()}_${userId}`, transaction: result};
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
const getUserBalance = async (userId) => {
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
const resolveMarket = async (adminId, marketId, result) => {
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

    const updateRef = db.ref();
    await updateRef.update(updates);
    return {success: true, message: "Market resolved successfully"};
  } catch (error) {
    console.error("Market resolution error:", error);
    return {success: false, error: error.message || String(error)};
  }
};

// ==================== ADMIN: FREEZE/UNFREEZE MARKET ====================
const setMarketFreeze = async (adminId, marketId, freeze = true) => {
  try {
    if (!adminId || !marketId) throw new Error("Missing parameters");

    const adminSnap = await db.ref(`admins/${adminId}`).get();
    if (!adminSnap.exists() || adminSnap.val() !== true) {
      throw new Error("Admin access required");
    }

    const marketRef = db.ref(`markets/${marketId}`);
    const snap = await marketRef.get();
    if (!snap.exists()) throw new Error("Market not found");

    const newStatus = freeze ? "frozen" : "open";
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
const freezeAndResolve = async (adminId, marketId, result) => {
  const freezeRes = await setMarketFreeze(adminId, marketId, true);
  if (!freezeRes.success) return freezeRes;
  return await resolveMarket(adminId, marketId, result);
};

module.exports = {
  placeBet,
  getUserBalance,
  resolveMarket,
  setMarketFreeze,
  freezeAndResolve,
  // expose formatVolume for potential reuse/tests
  formatVolume,
};
