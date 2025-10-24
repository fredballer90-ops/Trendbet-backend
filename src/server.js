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

// db handle - will be null if Firebase not available
const db = admin ? admin.database() : null;

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
  otps: [],
  bets: [],
  markets: []
};

// ---------- HEALTH ----------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TrendBet API is running!',
    database: 'In-memory + Firebase',
    usersCount: memoryDB.users.length,
    betsCount: memoryDB.bets.length,
    marketsCount: memoryDB.markets.length,
    firebaseStatus: db ? '✅ Enabled' : '❌ Disabled',
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

// ---------- AUTH (EMAIL-ONLY) ----------
app.post('/api/auth/register', (req, res) => {
  try {
    console.log('📧 REGISTRATION REQUEST:', JSON.stringify(req.body, null, 2));
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if user already exists by email
    const existingUser = memoryDB.users.find(u => u.email === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const user = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password,
      balance: 1000,
      totalWagered: 0,
      totalWinnings: 0,
      role: 'user',
      emailVerified: false,
      createdAt: new Date().toISOString()
    };

    memoryDB.users.push(user);

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    memoryDB.otps.push({
      email: email.toLowerCase(),
      code: otp,
      type: 'registration',
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    console.log('✅ USER CREATED:', { id: user.id, email: user.email });
    console.log(`📧 OTP for ${user.email}: ${otp}`);

    return res.json({
      success: true,
      message: 'OTP sent to your email',
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
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = identifier.toLowerCase().trim();
    const user = memoryDB.users.find(u => u.email === cleanEmail);
    
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    if (user.password !== password) return res.status(401).json({ success: false, error: 'Invalid password' });

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    memoryDB.otps.push({ 
      email: user.email, 
      code: otp, 
      type: 'login',
      expiresAt: Date.now() + 600000 
    });

    console.log(`📧 LOGIN OTP for ${user.email}: ${otp}`);
    
    return res.json({ 
      success: true, 
      message: 'OTP sent to your email', 
      userId: user.id, 
      debugOtp: otp 
    });

  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during login' });
  }
});

app.post('/api/auth/verify-login-otp', (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const currentTime = Date.now();
    
    const otpRecord = memoryDB.otps.find(o => 
      o.email === cleanEmail && 
      o.code === otpCode && 
      o.type === 'login' &&
      o.expiresAt > currentTime
    );
    
    if (!otpRecord) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    
    const user = memoryDB.users.find(u => u.email === cleanEmail);
    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    const token = `token-${Date.now()}-${user.id}`;
    
    // Remove used OTP
    memoryDB.otps = memoryDB.otps.filter(o => !(o.email === cleanEmail && o.type === 'login'));
    
    return res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        balance: user.balance, 
        role: user.role 
      } 
    });

  } catch (error) {
    console.error('💥 OTP VERIFICATION ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during OTP verification' });
  }
});

app.post('/api/auth/verify-registration-otp', (req, res) => {
  try {
    const { email, otpCode, userId } = req.body;
    const cleanEmail = email.toLowerCase().trim();
    const currentTime = Date.now();
    
    const otpRecord = memoryDB.otps.find(o => 
      o.email === cleanEmail && 
      o.code === otpCode && 
      o.type === 'registration' &&
      o.expiresAt > currentTime
    );
    
    if (!otpRecord) return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    
    const user = memoryDB.users.find(u => u.id === userId);
    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    // Mark email as verified
    user.emailVerified = true;
    
    const token = `token-${Date.now()}-${user.id}`;
    
    // Remove used OTP
    memoryDB.otps = memoryDB.otps.filter(o => !(o.email === cleanEmail && o.type === 'registration'));
    
    return res.json({ 
      success: true, 
      token, 
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email, 
        balance: user.balance, 
        role: user.role 
      } 
    });

  } catch (error) {
    console.error('💥 REGISTRATION OTP ERROR:', error);
    return res.status(500).json({ success: false, error: 'Internal server error during registration OTP verification' });
  }
});

app.post('/api/otp/resend', (req, res) => {
  try {
    const { email, type } = req.body;
    
    if (!email || !type) return res.status(400).json({ error: 'Email and type are required' });

    const cleanEmail = email.toLowerCase().trim();
    
    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Remove existing OTPs for this email and type
    memoryDB.otps = memoryDB.otps.filter(o => !(o.email === cleanEmail && o.type === type));
    
    // Add new OTP
    memoryDB.otps.push({ 
      email: cleanEmail, 
      code: otp, 
      type: type,
      expiresAt: Date.now() + 600000 
    });

    console.log(`🔄 OTP resent for ${cleanEmail}: ${otp}`);
    
    return res.json({ 
      success: true, 
      message: 'OTP resent successfully', 
      debugCode: otp 
    });

  } catch (error) {
    console.error('💥 RESEND OTP ERROR:', error);
    return res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// ---------- ADMIN ROUTES ----------
app.post('/api/admin/user-balance', (req, res) => {
  try {
    const { userId, amount } = req.body;

    const user = memoryDB.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    user.balance += parseFloat(amount);

    console.log(`💰 Balance updated: User ${userId} +${amount} = ${user.balance}`);

    res.json({
      success: true,
      message: `Added ${amount} to user balance`,
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Balance update error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Admin check endpoint
app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: true });
});

// Get all users with details
app.get('/api/admin/users', (req, res) => {
  res.json({
    success: true,
    users: memoryDB.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balance: u.balance,
      role: u.role,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt
    }))
  });
});

// ---------- BACKEND BETTING ROUTES ----------
app.post('/api/place-bet', async (req, res) => {
  try {
    const { userId, marketId, selection, odds, stake, potentialWin, category } = req.body;

    if (!userId || !marketId || !selection || !stake) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, marketId, selection, stake'
      });
    }

    const user = memoryDB.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const stakeAmount = parseFloat(stake);
    if (user.balance < stakeAmount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance'
      });
    }

    const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const betOdds = odds || 2.0;
    const betPotentialWin = potentialWin || stakeAmount * betOdds;

    const betData = {
      id: betId,
      userId,
      marketId,
      selection,
      odds: betOdds,
      stake: stakeAmount,
      potentialWin: betPotentialWin,
      category: category || 'general',
      status: 'pending',
      placedAt: new Date().toISOString(),
      settledAt: null,
      result: null
    };

    user.balance -= stakeAmount;
    user.totalWagered = (user.totalWagered || 0) + stakeAmount;
    
    memoryDB.bets.push(betData);
    
    console.log(`💰 Bet placed: User ${userId} bet ${stake} on ${selection}`);
    console.log(`📊 New balance: ${user.balance}`);
    
    return res.json({
      success: true,
      betId,
      newBalance: user.balance,
      message: 'Bet placed successfully',
      bet: betData
    });

  } catch (error) {
    console.error('💥 PLACE BET ERROR:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to place bet: ' + error.message
    });
  }
});

app.get('/api/user/:userId/balance', (req, res) => {
  try {
    const { userId } = req.params;
    const user = memoryDB.users.find(u => u.id === userId);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      balance: user.balance,
      totalWagered: user.totalWagered || 0,
      totalWinnings: user.totalWinnings || 0
    });
  } catch (error) {
    console.error('💥 GET BALANCE ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to get user balance' });
  }
});

app.get('/api/user/:userId/bets', (req, res) => {
  try {
    const { userId } = req.params;
    const userBets = memoryDB.bets.filter(bet => bet.userId === userId);
    res.json({ success: true, bets: userBets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- ADMIN ROUTES ----------
app.post('/api/admin/create-market', (req, res) => {
  try {
    const { title, description, category, startTime, endTime, options, status } = req.body;

    if (!title || !options || !Array.isArray(options)) {
      return res.status(400).json({ success: false, error: 'Title and options are required' });
    }

    const marketId = `market_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const market = {
      id: marketId,
      title,
      description: description || '',
      category: category || 'general',
      startTime: startTime || null,
      endTime: endTime || null,
      options,
      status: status || 'open',
      result: null,
      createdAt: new Date().toISOString()
    };

    memoryDB.markets.push(market);
    
    console.log(`🏟️ Market created: ${title} with ${options.length} options`);
    
    res.json({
      success: true,
      marketId,
      message: 'Market created successfully',
      market
    });
  } catch (error) {
    console.error('💥 CREATE MARKET ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to create market' });
  }
});

app.get('/api/admin/markets', (req, res) => {
  try {
    res.json({ success: true, markets: memoryDB.markets });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/admin/resolve-market', (req, res) => {
  try {
    const { marketId, result } = req.body;

    if (!marketId || !result) {
      return res.status(400).json({ success: false, error: 'Market ID and result are required' });
    }

    const market = memoryDB.markets.find(m => m.id === marketId);
    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    market.status = 'resolved';
    market.result = result;
    market.resolvedAt = new Date().toISOString();

    const winningBets = memoryDB.bets.filter(bet =>
      bet.marketId === marketId && bet.selection === result && bet.status === 'pending'
    );

    let totalPayout = 0;
    let winnersCount = 0;

    winningBets.forEach(bet => {
      const user = memoryDB.users.find(u => u.id === bet.userId);
      if (user) {
        const payout = bet.potentialWin;
        user.balance += payout;
        user.totalWinnings = (user.totalWinnings || 0) + payout;
        bet.status = 'won';
        bet.settledAt = new Date().toISOString();
        bet.result = 'won';
        totalPayout += payout;
        winnersCount++;
      }
    });

    const losingBets = memoryDB.bets.filter(bet =>
      bet.marketId === marketId && bet.selection !== result && bet.status === 'pending'
    );

    losingBets.forEach(bet => {
      bet.status = 'lost';
      bet.settledAt = new Date().toISOString();
      bet.result = 'lost';
    });

    console.log(`🎯 Market resolved: ${market.title} -> ${result}`);
    console.log(`💰 ${winnersCount} winners, total payout: ${totalPayout}`);
    
    res.json({
      success: true,
      message: `Market resolved: ${result}`,
      winners: winnersCount,
      losers: losingBets.length,
      totalPayout
    });
  } catch (error) {
    console.error('💥 RESOLVE MARKET ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to resolve market' });
  }
});

app.post('/api/admin/freeze-market', (req, res) => {
  try {
    const { marketId, freeze } = req.body;

    if (!marketId) {
      return res.status(400).json({ success: false, error: 'Market ID is required' });
    }

    const market = memoryDB.markets.find(m => m.id === marketId);
    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    market.status = freeze ? 'frozen' : 'open';
    
    res.json({
      success: true,
      message: `Market ${freeze ? 'frozen' : 'unfrozen'} successfully`,
      market
    });
  } catch (error) {
    console.error('💥 FREEZE MARKET ERROR:', error);
    res.status(500).json({ success: false, error: 'Failed to freeze market' });
  }
});

// ---------- DEBUG ----------
app.get('/api/debug/users', (req, res) => {
  return res.json({
    users: memoryDB.users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      balance: u.balance,
      role: u.role,
      emailVerified: u.emailVerified
    })),
    otps: memoryDB.otps,
    currentTime: Date.now()
  });
});

app.get('/api/debug/markets', (req, res) => {
  return res.json({
    markets: memoryDB.markets,
    totalMarkets: memoryDB.markets.length
  });
});

app.get('/api/debug/firebase', async (req, res) => {
  try {
    if (!db) return res.json({ firebase: 'not_initialized' });
    
    const usersRef = db.ref('users');
    const matchesRef = db.ref('matches');
    const betsRef = db.ref('bets');
    
    const [usersSnapshot, matchesSnapshot, betsSnapshot] = await Promise.all([
      usersRef.once('value'),
      matchesRef.once('value'),
      betsRef.once('value')
    ]);

    return res.json({
      firebase: 'connected',
      users: usersSnapshot.val() || {},
      matches: matchesSnapshot.val() || {},
      bets: betsSnapshot.val() || {}
    });
  } catch (error) {
    return res.json({ firebase: 'error', error: error.message });
  }
});

app.get('/api/test-firebase-init', (req, res) => {
  try {
    if (!admin) return res.json({ success: false, error: "Firebase not initialized" });
    const testDb = admin.database();
    return res.json({ success: true, message: "Firebase initialized successfully!" });
  } catch (error) {
    return res.json({ success: false, error: error.message });
  }
});

// Temporary route to make user admin
app.post('/api/dev/make-admin', (req, res) => {
  const { userId } = req.body;
  const user = memoryDB.users.find(u => u.id === userId);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  user.role = 'admin';

  res.json({
    success: true,
    message: 'User is now admin',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
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
  console.log(`💾 Memory DB: ${memoryDB.users.length} users, ${memoryDB.bets.length} bets, ${memoryDB.markets.length} markets`);
  console.log(`📧 AUTH: Email-only authentication enabled`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
