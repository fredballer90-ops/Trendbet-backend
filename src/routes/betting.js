import admin from "../config/firebase.js";
const express = require('express');
const router = express.Router();

// Initialize Firebase Admin if not already done
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: process.env.FIREBASE_TYPE,
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL || "https://trendbet-c2793-default-rtdb.firebaseio.com"
  });
}

const db = admin.database();

// Place a bet
router.post('/place-bet', async (req, res) => {
  try {
    const { uid, matchId, outcome, amount } = req.body;
    
    // Validate input
    if (!uid || !matchId || !outcome || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get user balance
    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user || user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Check if match is active
    const matchRef = db.ref(`matches/${matchId}`);
    const matchSnapshot = await matchRef.once('value');
    const match = matchSnapshot.val();

    if (!match || match.status !== 'active') {
      return res.status(400).json({ error: 'Match not available for betting' });
    }

    // Generate bet ID
    const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create bet
    const betData = {
      uid,
      matchId,
      outcome,
      amount: parseFloat(amount),
      timestamp: Date.now(),
      status: 'pending'
    };

    // Update user balance and create bet in transaction
    await db.ref().update({
      [`users/${uid}/balance`]: user.balance - amount,
      [`bets/${betId}`]: betData,
      [`userBets/${uid}/${betId}`]: true
    });

    res.json({ 
      success: true, 
      betId, 
      newBalance: user.balance - amount,
      message: 'Bet placed successfully'
    });

  } catch (error) {
    console.error('Error placing bet:', error);
    res.status(500).json({ error: 'Failed to place bet' });
  }
});

// Get user balance
router.get('/user/:uid/balance', async (req, res) => {
  try {
    const { uid } = req.params;
    
    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      uid, 
      balance: user.balance || 0,
      username: user.username || 'User'
    });

  } catch (error) {
    console.error('Error getting user balance:', error);
    res.status(500).json({ error: 'Failed to get user balance' });
  }
});

// Resolve market (admin function)
router.post('/resolve-market', async (req, res) => {
  try {
    const { matchId, winningOutcome } = req.body;

    if (!matchId || !winningOutcome) {
      return res.status(400).json({ error: 'Missing matchId or winningOutcome' });
    }

    // Get all bets for this match
    const betsRef = db.ref('bets');
    const betsSnapshot = await betsRef.orderByChild('matchId').equalTo(matchId).once('value');
    const bets = betsSnapshot.val() || {};

    let updates = {};
    let winners = [];
    let losers = [];

    // Process each bet
    Object.keys(bets).forEach(betId => {
      const bet = bets[betId];
      
      if (bet.outcome === winningOutcome) {
        // Winner - double their money
        updates[`bets/${betId}/status`] = 'won';
        updates[`bets/${betId}/payout`] = bet.amount * 2;
        winners.push(bet.uid);
      } else {
        // Loser
        updates[`bets/${betId}/status`] = 'lost';
        losers.push(bet.uid);
      }
    });

    // Update match status
    updates[`matches/${matchId}/status`] = 'completed';
    updates[`matches/${matchId}/winningOutcome`] = winningOutcome;

    // Update user balances for winners
    const uniqueWinners = [...new Set(winners)];
    for (const uid of uniqueWinners) {
      const userWinningBets = Object.keys(bets).filter(betId => 
        bets[betId].uid === uid && bets[betId].outcome === winningOutcome
      );
      
      const totalWin = userWinningBets.reduce((sum, betId) => 
        sum + (bets[betId].amount * 2), 0
      );

      const userRef = db.ref(`users/${uid}`);
      const userSnapshot = await userRef.once('value');
      const user = userSnapshot.val();

      updates[`users/${uid}/balance`] = (user.balance || 0) + totalWin;
    }

    // Execute all updates
    await db.ref().update(updates);

    res.json({ 
      success: true,
      message: `Market resolved. ${winners.length} winners, ${losers.length} losers.`,
      winners: uniqueWinners.length
    });

  } catch (error) {
    console.error('Error resolving market:', error);
    res.status(500).json({ error: 'Failed to resolve market' });
  }
});

// Freeze market (admin function)
router.post('/freeze-market', async (req, res) => {
  try {
    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'Missing matchId' });
    }

    await db.ref(`matches/${matchId}/status`).set('frozen');

    res.json({ 
      success: true,
      message: 'Market frozen successfully'
    });

  } catch (error) {
    console.error('Error freezing market:', error);
    res.status(500).json({ error: 'Failed to freeze market' });
  }
});

module.exports = router;
