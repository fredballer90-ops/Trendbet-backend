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
      totalWagered: 0,
      totalWinnings: 0,
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

    // Find user in memoryDB
    const user = memoryDB.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
    }

    // Check if user has sufficient balance
    const stakeAmount = parseFloat(stake);
    if (user.balance < stakeAmount) {
      return res.status(400).json({ 
        success: false, 
        error: 'Insufficient balance' 
      });
    }

    // Generate unique bet ID
    const betId = `bet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create bet object
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

    // Update user balance and stats
    user.balance -= stakeAmount;
    user.totalWagered = (user.totalWagered || 0) + stakeAmount;

    // Store bet in memoryDB
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
    
    res.json({
      success: true,
      bets: userBets
    });
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
    res.json({
      success: true,
      markets: memoryDB.markets
    });
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

    // Update market
    market.status = 'resolved';
    market.result = result;
    market.resolvedAt = new Date().toISOString();

    // Find and update winning bets
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

    // Mark losing bets
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

app.post('/api/admin/user-balance', (req, res) => {
  try {
    const { userId, amount } = req.body;
    
    const user = memoryDB.users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    user.balance += parseFloat(amount);
    
    res.json({
      success: true,
      message: `Added ${amount} to user balance`,
      newBalance: user.balance
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ---------- DEBUG ----------
app.get('/api/debug/users', (req, res) => {
  return res.json({ 
    users: memoryDB.users.map(u => ({ 
      id: u.id, 
      name: u.name, 
      phone: u.phone, 
      email: u.email,
      balance: u.balance,
      role: u.role
    })), 
    otps: memoryDB.otps, 
    currentTime: Date.now() 
  });
});

app.get('/api/debug/bets', (req, res) => {
  return res.json({
    bets: memoryDB.bets,
    totalBets: memoryDB.bets.length
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
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
