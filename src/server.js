import express from "express";
import cors from "cors";
import admin from "./config/firebase.js";

const app = express();

// Use JSON and CORS
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.2.100:3000'],
  credentials: true
}));
app.use(express.json());

// db handle from firebase admin (may be null if not initialized)
const db = (admin && typeof admin.database === 'function') ? admin.database() : null;

// Request logging middleware
app.use((req, res, next) => {
  try {
    console.log(`📨 ${req.method} ${req.path}`, {
      body: req.body,
      ip: req.ip,
      hostname: req.hostname
    });
  } catch (e) { /* ignore logging errors */ }
  next();
});

// In-memory DB for auth flows
const memoryDB = {
  users: [],
  otps: []
};

// ---------- HEALTH ----------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TrendBet API is running!',
    database: 'In-memory + Firebase',
    usersCount: memoryDB.users.length,
    firebaseStatus: db ? 'Connected' : 'Disabled',
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

// ---------- AUTH ----------
app.post('/api/auth/register', (req, res) => {
  try {
    console.log('🔐 REGISTRATION REQUEST:', JSON.stringify(req.body, null, 2));
    const { name, phone, email, password } = req.body;
    if (!name || !phone || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ error: 'Please enter a valid Kenyan phone number' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const existingUser = memoryDB.users.find(u => u.phone === cleanPhone || u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this phone or email already exists' });
    }

    const user = {
      id: Date.now().toString(),
      name,
      phone: cleanPhone,
      email,
      password,
      balance: 1000,
      role: 'user',
      createdAt: new Date().toISOString()
    };

    memoryDB.users.push(user);

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    memoryDB.otps.push({
      phone: cleanPhone,
      code: otp,
      expiresAt: Date.now() + 600000
    });

    console.log('✅ USER CREATED:', { id: user.id, phone: user.phone });
    console.log(`📱 OTP for ${user.phone}: ${otp}`);

    return res.json({
      success: true,
      message: 'OTP sent to your phone',
      userId: user.id,
      debugOtp: otp
    });
  } catch (error) {
    console.error('💥 REGISTRATION ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during registration' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    console.log('🔐 LOGIN REQUEST:', JSON.stringify(req.body, null, 2));
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Phone/Email and password are required' });
    }

    const cleanIdentifier = identifier.replace(/\s/g, '');
    const user = memoryDB.users.find(u => u.phone === cleanIdentifier || u.email === cleanIdentifier);

    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (user.password !== password) return res.status(401).json({ success: false, error: 'Invalid password' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    memoryDB.otps.push({ phone: user.phone, code: otp, expiresAt: Date.now() + 600000 });

    console.log(`📱 LOGIN OTP for ${user.phone}: ${otp}`);
    return res.json({ success: true, message: 'OTP sent to your phone', userId: user.id, debugOtp: otp });
  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
});

app.post('/api/auth/verify-login-otp', (req, res) => {
  try {
    const { phone, otpCode } = req.body;
    const cleanPhone = phone.replace(/\s/g, '');
    const currentTime = Date.now();

    const otpRecord = memoryDB.otps.find(o => o.phone === cleanPhone && o.code === otpCode && o.expiresAt > currentTime);
    if (!otpRecord) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });

    const user = memoryDB.users.find(u => u.phone === cleanPhone);
    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    const token = `token-${Date.now()}-${user.id}`;
    memoryDB.otps = memoryDB.otps.filter(o => o.phone !== cleanPhone);

    return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, balance: user.balance, role: user.role } });
  } catch (error) {
    console.error('💥 OTP VERIFICATION ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during OTP verification' });
  }
});

app.post('/api/auth/verify-registration-otp', (req, res) => {
  try {
    const { phone, otpCode, userId } = req.body;
    const cleanPhone = phone.replace(/\s/g, '');
    const currentTime = Date.now();

    const otpRecord = memoryDB.otps.find(o => o.phone === cleanPhone && o.code === otpCode && o.expiresAt > currentTime);
    if (!otpRecord) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });

    const user = memoryDB.users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    const token = `token-${Date.now()}-${user.id}`;
    memoryDB.otps = memoryDB.otps.filter(o => o.phone !== cleanPhone);

    return res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone, balance: user.balance, role: user.role } });
  } catch (error) {
    console.error('💥 REGISTRATION OTP ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during registration OTP verification' });
  }
});

app.post('/api/otp/resend', (req, res) => {
  try {
    const { emailOrPhone, type } = req.body;
    if (!emailOrPhone || !type) return res.status(400).json({ error: 'Phone/Email and type are required' });

    const cleanPhone = emailOrPhone.replace(/\s/g, '');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    memoryDB.otps = memoryDB.otps.filter(o => o.phone !== cleanPhone);
    memoryDB.otps.push({ phone: cleanPhone, code: otp, expiresAt: Date.now() + 600000 });

    return res.json({ success: true, message: 'OTP resent successfully', debugCode: otp });
  } catch (error) {
    console.error('💥 RESEND OTP ERROR:', error);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// ---------- FIREBASE BETTING ROUTES ----------
app.post('/api/place-bet', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Betting service temporarily unavailable' });

    const { uid, matchId, outcome, amount } = req.body;
    if (!uid || !matchId || !outcome || !amount) return res.status(400).json({ error: 'Missing required fields: uid, matchId, outcome, amount' });

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user || user.balance < amount) return res.status(400).json({ error: 'Insufficient balance' });

    const matchRef = db.ref(`matches/${matchId}`);
    const matchSnapshot = await matchRef.once('value');
    const match = matchSnapshot.val();

    if (!match || match.status !== 'active') return res.status(400).json({ error: 'Match not available for betting' });

    const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
    const betData = { uid, matchId, outcome, amount: parseFloat(amount), timestamp: Date.now(), status: 'pending' };

    await db.ref().update({
      [`users/${uid}/balance`]: user.balance - amount,
      [`bets/${betId}`]: betData,
      [`userBets/${uid}/${betId}`]: true
    });

    return res.json({ success: true, betId, newBalance: user.balance - amount, message: 'Bet placed successfully' });
  } catch (error) {
    console.error('💥 PLACE BET ERROR:', error);
    return res.status(500).json({ error: 'Failed to place bet: ' + error.message });
  }
});

app.get('/api/user/:uid/balance', async (req, res) => {
  try {
    const { uid } = req.params;
    if (!db) return res.status(503).json({ error: 'Service temporarily unavailable' });

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();
    if (!user) return res.status(404).json({ error: 'User not found in database' });

    return res.json({ uid, balance: user.balance || 0, username: user.username || 'User' });
  } catch (error) {
    console.error('💥 GET BALANCE ERROR:', error);
    return res.status(500).json({ error: 'Failed to get user balance' });
  }
});

app.post('/api/resolve-market', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Service temporarily unavailable' });

    const { matchId, winningOutcome } = req.body;
    if (!matchId || !winningOutcome) return res.status(400).json({ error: 'Missing matchId or winningOutcome' });

    const betsRef = db.ref('bets');
    const betsSnapshot = await betsRef.orderByChild('matchId').equalTo(matchId).once('value');
    const bets = betsSnapshot.val() || {};

    let updates = {};
    let winners = [];
    let losers = [];

    Object.keys(bets).forEach(betId => {
      const bet = bets[betId];
      if (bet.outcome === winningOutcome) {
        updates[`bets/${betId}/status`] = 'won';
        updates[`bets/${betId}/payout`] = bet.amount * 2;
        winners.push(bet.uid);
      } else {
        updates[`bets/${betId}/status`] = 'lost';
        losers.push(bet.uid);
      }
    });

    updates[`matches/${matchId}/status`] = 'completed';
    updates[`matches/${matchId}/winningOutcome`] = winningOutcome;

    const uniqueWinners = [...new Set(winners)];
    for (const uid of uniqueWinners) {
      const userWinningBets = Object.keys(bets).filter(betId => bets[betId].uid === uid && bets[betId].outcome === winningOutcome);
      const totalWin = userWinningBets.reduce((sum, betId) => sum + (bets[betId].amount * 2), 0);
      const userRef = db.ref(`users/${uid}`);
      const userSnapshot = await userRef.once('value');
      const user = userSnapshot.val();
      updates[`users/${uid}/balance`] = (user.balance || 0) + totalWin;
    }

    await db.ref().update(updates);

    return res.json({ success: true, message: `Market resolved. ${winners.length} winners, ${losers.length} losers.`, winners: uniqueWinners.length, losers: losers.length });
  } catch (error) {
    console.error('💥 RESOLVE MARKET ERROR:', error);
    return res.status(500).json({ error: 'Failed to resolve market: ' + error.message });
  }
});

app.post('/api/freeze-market', async (req, res) => {
  try {
    if (!db) return res.status(503).json({ error: 'Service temporarily unavailable' });

    const { matchId } = req.body;
    if (!matchId) return res.status(400).json({ error: 'Missing matchId' });

    await db.ref(`matches/${matchId}/status`).set('frozen');
    return res.json({ success: true, message: 'Market frozen successfully' });
  } catch (error) {
    console.error('💥 FREEZE MARKET ERROR:', error);
    return res.status(500).json({ error: 'Failed to freeze market: ' + error.message });
  }
});

// ---------- DEBUG ----------
app.get('/api/debug/users', (req, res) => {
  return res.json({ users: memoryDB.users.map(u => ({ id: u.id, name: u.name, phone: u.phone, email: u.email })), otps: memoryDB.otps, currentTime: Date.now() });
});

app.get('/api/debug/firebase', async (req, res) => {
  try {
    if (!db) return res.json({ firebase: 'not_initialized' });

    const usersRef = db.ref('users');
    const matchesRef = db.ref('matches');
    const betsRef = db.ref('bets');

    const [usersSnapshot, matchesSnapshot, betsSnapshot] = await Promise.all([ usersRef.once('value'), matchesRef.once('value'), betsRef.once('value') ]);

    return res.json({ firebase: 'connected', users: usersSnapshot.val() || {}, matches: matchesSnapshot.val() || {}, bets: betsSnapshot.val() || {} });
  } catch (error) {
    return res.json({ firebase: 'error', error: error.message });
  }
});

app.get('/api/test-firebase-init', (req, res) => {
  try {
    const testDb = admin.database();
    return res.json({ success: true, message: "Firebase initialized successfully!" });
  } catch (error) {
    return res.json({ success: false, error: error.message });
  }
});

// Error handlers
app.use((err, req, res, next) => {
  console.error('💥 SERVER ERROR:', err);
  return res.status(500).json({ success: false, error: 'Internal server error' });
});
app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found' }));

// Server start
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.get("/", (req, res) => res.status(200).send("✅ TrendBet backend is live"));

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 TrendBet Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Local: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network: http://192.168.2.100:${PORT}/api/health`);
  console.log(`🐛 Debug: http://localhost:${PORT}/api/debug/users`);
  console.log(`🔥 Firebase: ${db ? '✅ Enabled' : '❌ Disabled'}`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
