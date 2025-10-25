import express from 'express';
import admin from '../config/firebase.js';

const router = express.Router();
const db = admin.database();

// Place a bet
router.post('/place', async (req, res) => {
  try {
    const { userId, marketId, outcome, amount } = req.body;

    console.log('📤 Bet request received:', { userId, marketId, outcome, amount });

    // Validate
    if (!userId || !marketId || !outcome || !amount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: userId, marketId, outcome, amount' 
      });
    }

    // Validate amount
    const betAmount = parseFloat(amount);
    if (betAmount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Minimum bet is KSH 100'
      });
    }
    if (betAmount > 100000) {
      return res.status(400).json({
        success: false,
        error: 'Maximum bet is KSH 100,000'
      });
    }

    // Create bet
    const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const betData = {
      userId,
      marketId,
      outcome,
      amount: betAmount,
      status: 'pending',
      placedAt: new Date().toISOString(),
      betId
    };

    // Save to Firebase
    const betsRef = db.ref('bets');
    const newBetRef = betsRef.push();
    await newBetRef.set(betData);

    console.log('✅ Bet placed successfully:', betId);

    res.json({
      success: true,
      betId: betId,
      message: 'Bet placed successfully'
    });

  } catch (error) {
    console.error('❌ Error placing bet:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    });
  }
});

// Get user's bets
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const betsRef = db.ref('bets');
    const snapshot = await betsRef.orderByChild('userId').equalTo(userId).once('value');
    const bets = snapshot.val() || {};
    
    const betsArray = Object.keys(bets).map(id => ({
      id,
      ...bets[id]
    }));
    
    res.json({
      success: true,
      bets: betsArray
    });
  } catch (error) {
    console.error('❌ Error fetching user bets:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch bets' 
    });
  }
});

export default router;
