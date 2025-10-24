const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.database();

// Get all active markets
router.get('/', async (req, res) => {
  try {
    const matchesRef = db.ref('matches');
    const snapshot = await matchesRef.orderByChild('status').equalTo('active').once('value');
    const matches = snapshot.val() || {};

    const marketsArray = Object.keys(matches).map(id => ({
      id,
      ...matches[id]
    }));

    res.json({
      success: true,
      markets: marketsArray
    });
  } catch (error) {
    console.error('❌ Error fetching markets:', error);
    res.status(500).json({ error: 'Failed to fetch markets' });
  }
});

// Get specific market
router.get('/:marketId', async (req, res) => {
  try {
    const { marketId } = req.params;
    const matchRef = db.ref(`matches/${marketId}`);
    const snapshot = await matchRef.once('value');
    const match = snapshot.val();

    if (!match) {
      return res.status(404).json({ error: 'Market not found' });
    }

    res.json({
      success: true,
      market: { id: marketId, ...match }
    });
  } catch (error) {
    console.error('❌ Error fetching market:', error);
    res.status(500).json({ error: 'Failed to fetch market' });
  }
});

module.exports = router;
