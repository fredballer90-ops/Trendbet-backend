const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.2.100:3000'],
  credentials: true
}));

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, {
    body: req.body,
    ip: req.ip,
    hostname: req.hostname
  });
  next();
});

// ==================== FIREBASE INITIALIZATION ====================
let db;
function initializeFirebase() {
  try {
    if (!admin.apps.length) {
      console.log('🔄 Initializing Firebase with hardcoded config...');
      
      const firebaseConfig = {
        type: "service_account",
        project_id: "trendbet-c2793",
        private_key_id: "e7865322e05be6ac0bdf34138b5ec5c233628fba",
        private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRkhhqu2kNDCUc\nxVukGjeflzHtzK4V7/xbgBGxRrPk9Z+31mbXLgKKym/b8H7oFbh3ZqLAhrNuZoXh\noH+yDCjbiwt2u0gpo050Y3iNa2oNIv5cIl5LBQlDQN71/2GrI+n+sZXUA8XOUWwe\nsv/TNTqd6JU3tpAh4qKp4zUhz89k5iVvVL4tHhWEWQBQyHIlko4+BpBSJDtdDpbH\n9f0JTLPAesknDhbYtjcykdNkiJ1ntSwdMAuhx1otlgJXJGMZJ3/SRpccFUYMiG7o\ns8vqRE0PKTP58bRVdWgib5JHm2UL2xkyT2mN061Mt0uoGVpa/wBkJew7OXz8R2BG\nLRAhkIFBAgMBAAECggEACAWcOQrnwF1VuWqr7wlh36/YYH+7rd+ZgaD5+LRwIXla\nYtigmPtkpr+0rfi43fKgvoxgIY3fCGz3TW+tzEKhqg0Vt94SvptuSzbYc7ZH8nvc\nHtZryx8JnUTOHKqkCr94kYKhd2xuxtiHploae0JH4pVZyrh24Xeh25WvzvgjRCzJ\nW1v3doT7bMVQ+gbT8hFppDoWeUITbc5xkbCwBi76QQjbJbFkHB9m7fCxIFbB5Dz/\nAIeyg0HautGFqwpyo46mzy3373WqcKiRWzHcppLhEOHXngdRd9t1d8c4iESnCEBc\nGJUD9ojxL0ON+v1PKY2pTcIKbcRogoNBhOnca4icEQKBgQDrxLAN88pblOuaIg70\nrJdQA+NAY1OhZpNIw9LSEDPX+OdjY6wFYf2tqdSrYbiUECbln0GRbwJR6EFWP7nw\n0FuMQdRkFtkh3kfX7vFdQ44lxo9JU+IiJ0/dVSmm2iflXh6A72NiHMregCQJ3JKf\nY2J7ZF+HSgILIa8piKEFElSuswKBgQDjjec/9+Biz6tsV1AJrI7JmV5pv0hiFXBY\n5euqwi/kedvRTCrHNNz2krst3yeaEg5+goXjnm6zZGP6F9f0EtilgbQCPKYL3C5c\nYIP+ksoY9VjWWKzvDMTCZNzDMbPgVAcR/swaW8deVie2X3V+AuTa34gkN1MgY1z9\nu6ncuoHKOwKBgHEw9PU93iEp1hMh1txRIDQiKbB3/2a1wHBm04hWjw1ZSn3FFIlh\nClGd/6RoPh2Xw5TqaKhSC2MXhobKAZND9S/ZSwbikUxZU1SwOuDz1gL82T3zL9YF\n2aoBgQXCJvVPwoVUaPppqFw6WRMC+sHbDSUAg3yIY4LEoTvnhKbSriVRAoGAByG9\na63TJIWps72QzpzP5NWfteS+2gQd/0tFdZacdaa0Ev02IgQwILI8l5V04klKlwB0\nPcwLYCf3UjFJHWcxzw4fnCpWcey2r0J/II1tNBcMb7tbwCpASG9s09lM7+zyQ8ge\nkXzq5LQCjp6zSf3BOnLjC2+IdW1nzrQBAN//jV0CgYEArV/bGav2II1kT4qQF6uZ\nWMHyfZ5zYxj+mb0iKx6C+P6jUT6oRkPTIMJrpq69weVeuWpnh/uLo5Uu07UyqQnT\n75GFNefHJoREtuohy82FdLIHRZRm9SVxglrjACj8SeUzMJMfrnYcb+69cOsGbBYh\n3k7T3RTSQSXd20bb4e9KN9k=\n-----END PRIVATE KEY-----\n",
        client_email: "firebase-adminsdk-fbsvc@trendbet-c2793.iam.gserviceaccount.com",
        client_id: "106370486515535071439",
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40trendbet-c2793.iam.gserviceaccount.com",
        universe_domain: "googleapis.com"
      };

      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
        databaseURL: "https://trendbet-c2793-default-rtdb.firebaseio.com"
      });
      
      console.log('✅ Firebase Admin initialized successfully');
      return admin.database();
    }
    return admin.database();
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    return null;
  }
}


// Initialize Firebase when server starts
db = initializeFirebase();

// ==================== IN-MEMORY DATABASE (EXISTING) ====================
const memoryDB = {
  users: [],
  otps: []
};

// ==================== EXISTING AUTH ENDPOINTS ====================

// Health check
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

// Auth endpoints
app.post('/api/auth/register', (req, res) => {
  try {
    console.log('🔐 REGISTRATION REQUEST:', JSON.stringify(req.body, null, 2));
    const { name, phone, email, password } = req.body;

    // Validate required fields
    if (!name || !phone || !email || !password) {
      console.log('❌ Missing fields:', { name, phone, email, password: !!password });
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate phone format (Kenyan)
    const phoneRegex = /^(\+?254|0)?[17]\d{8}$/;
    const cleanPhone = phone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      console.log('❌ Invalid phone format:', phone);
      return res.status(400).json({ error: 'Please enter a valid Kenyan phone number' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Invalid email format:', email);
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if user already exists
    const existingUser = memoryDB.users.find(u => u.phone === cleanPhone || u.email === email);
    if (existingUser) {
      console.log('❌ User already exists:', { phone: cleanPhone, email });
      return res.status(400).json({ error: 'User with this phone or email already exists' });
    }

    // Create user
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

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    memoryDB.otps.push({
      phone: cleanPhone,
      code: otp,
      expiresAt: Date.now() + 600000 // 10 minutes
    });

    console.log('✅ USER CREATED:', { id: user.id, phone: user.phone });
    console.log(`📱 OTP for ${user.phone}: ${otp}`);
    console.log('📊 Total users:', memoryDB.users.length);
    console.log('📋 Current OTPs:', memoryDB.otps);

    res.json({
      success: true,
      message: 'OTP sent to your phone',
      userId: user.id,
      debugOtp: otp
    });

  } catch (error) {
    console.error('💥 REGISTRATION ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration'
    });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    console.log('🔐 LOGIN REQUEST:', JSON.stringify(req.body, null, 2));
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: 'Phone/Email and password are required'
      });
    }

    const cleanIdentifier = identifier.replace(/\s/g, '');
    const user = memoryDB.users.find(u =>
      u.phone === cleanIdentifier || u.email === cleanIdentifier
    );

    if (!user) {
      console.log('❌ USER NOT FOUND:', cleanIdentifier);
      return res.status(401).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.password !== password) {
      console.log('❌ INVALID PASSWORD for user:', cleanIdentifier);
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    memoryDB.otps.push({
      phone: user.phone,
      code: otp,
      expiresAt: Date.now() + 600000
    });

    console.log(`📱 LOGIN OTP for ${user.phone}: ${otp}`);
    console.log('📋 Current OTPs:', memoryDB.otps);

    res.json({
      success: true,
      message: 'OTP sent to your phone',
      userId: user.id,
      debugOtp: otp
    });

  } catch (error) {
    console.error('💥 LOGIN ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during login'
    });
  }
});

app.post('/api/auth/verify-login-otp', (req, res) => {
  try {
    console.log('✅ VERIFY LOGIN OTP:', req.body);
    const { phone, otpCode } = req.body;

    const cleanPhone = phone.replace(/\s/g, '');
    const currentTime = Date.now();

    console.log('🔍 Looking for OTP:', {
      phone: cleanPhone,
      otpCode,
      currentTime,
      allOtps: memoryDB.otps
    });

    const otpRecord = memoryDB.otps.find(o =>
      o.phone === cleanPhone &&
      o.code === otpCode &&
      o.expiresAt > currentTime
    );

    if (!otpRecord) {
      console.log('❌ INVALID OTP for phone:', cleanPhone);
      console.log('💡 Available OTPs for this phone:', memoryDB.otps.filter(o => o.phone === cleanPhone));
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    const user = memoryDB.users.find(u => u.phone === cleanPhone);

    if (!user) {
      console.log('❌ USER NOT FOUND for phone:', cleanPhone);
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    const token = `token-${Date.now()}-${user.id}`;

    // Remove used OTP
    memoryDB.otps = memoryDB.otps.filter(o => o.phone !== cleanPhone);

    console.log('✅ LOGIN SUCCESSFUL for user:', user.phone);
    console.log('📋 OTPs after removal:', memoryDB.otps);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role
      }
    });

  } catch (error) {
    console.error('💥 OTP VERIFICATION ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during OTP verification'
    });
  }
});

app.post('/api/auth/verify-registration-otp', (req, res) => {
  try {
    console.log('✅ VERIFY REGISTRATION OTP:', req.body);
    const { phone, otpCode, userId } = req.body;

    const cleanPhone = phone.replace(/\s/g, '');
    const currentTime = Date.now();

    console.log('🔍 Looking for OTP:', {
      phone: cleanPhone,
      otpCode,
      userId,
      currentTime,
      allOtps: memoryDB.otps
    });

    const otpRecord = memoryDB.otps.find(o =>
      o.phone === cleanPhone &&
      o.code === otpCode &&
      o.expiresAt > currentTime
    );

    if (!otpRecord) {
      console.log('❌ INVALID OTP for registration:', cleanPhone);
      console.log('💡 Available OTPs for this phone:', memoryDB.otps.filter(o => o.phone === cleanPhone));
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired OTP'
      });
    }

    const user = memoryDB.users.find(u => u.id === userId);

    if (!user) {
      console.log('❌ USER NOT FOUND with ID:', userId);
      return res.status(400).json({
        success: false,
        error: 'User not found'
      });
    }

    const token = `token-${Date.now()}-${user.id}`;

    // Remove used OTP
    memoryDB.otps = memoryDB.otps.filter(o => o.phone !== cleanPhone);

    console.log('✅ REGISTRATION COMPLETE for user:', user.phone);
    console.log('📋 OTPs after removal:', memoryDB.otps);

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role
      }
    });

  } catch (error) {
    console.error('💥 REGISTRATION OTP ERROR:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during registration OTP verification'
    });
  }
});

// Resend OTP endpoint
app.post('/api/otp/resend', (req, res) => {
  try {
    console.log('🔄 RESEND OTP REQUEST:', req.body);
    const { emailOrPhone, type } = req.body;

    if (!emailOrPhone || !type) {
      return res.status(400).json({ error: 'Phone/Email and type are required' });
    }

    const cleanPhone = emailOrPhone.replace(/\s/g, '');

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove existing OTPs for this phone
    memoryDB.otps = memoryDB.otps.filter(o => o.phone !== cleanPhone);

    // Add new OTP
    memoryDB.otps.push({
      phone: cleanPhone,
      code: otp,
      expiresAt: Date.now() + 600000
    });

    console.log(`📱 NEW OTP for ${cleanPhone}: ${otp}`);
    console.log('📋 Current OTPs after resend:', memoryDB.otps);

    res.json({
      success: true,
      message: 'OTP resent successfully',
      debugCode: otp
    });

  } catch (error) {
    console.error('💥 RESEND OTP ERROR:', error);
    res.status(500).json({ error: 'Failed to resend OTP' });
  }
});

// ==================== FIREBASE BETTING ROUTES ====================

// Place a bet
app.post('/api/place-bet', async (req, res) => {
  try {
    console.log('🎯 PLACE BET REQUEST:', req.body);
    
    if (!db) {
      return res.status(503).json({ error: 'Betting service temporarily unavailable' });
    }

    const { uid, matchId, outcome, amount } = req.body;
    
    // Validate input
    if (!uid || !matchId || !outcome || !amount) {
      return res.status(400).json({ error: 'Missing required fields: uid, matchId, outcome, amount' });
    }

    // Get user balance from Firebase
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

    console.log('✅ BET PLACED SUCCESSFULLY:', { betId, uid, amount });

    res.json({ 
      success: true, 
      betId, 
      newBalance: user.balance - amount,
      message: 'Bet placed successfully'
    });

  } catch (error) {
    console.error('💥 PLACE BET ERROR:', error);
    res.status(500).json({ error: 'Failed to place bet: ' + error.message });
  }
});

// Get user balance from Firebase
app.get('/api/user/:uid/balance', async (req, res) => {
  try {
    const { uid } = req.params;
    
    if (!db) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();

    if (!user) {
      return res.status(404).json({ error: 'User not found in database' });
    }

    res.json({ 
      uid, 
      balance: user.balance || 0,
      username: user.username || 'User'
    });

  } catch (error) {
    console.error('💥 GET BALANCE ERROR:', error);
    res.status(500).json({ error: 'Failed to get user balance' });
  }
});

// Resolve market (admin function)
app.post('/api/resolve-market', async (req, res) => {
  try {
    console.log('🏁 RESOLVE MARKET REQUEST:', req.body);
    
    if (!db) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

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

    console.log('✅ MARKET RESOLVED:', { matchId, winners: uniqueWinners.length, losers: losers.length });

    res.json({ 
      success: true,
      message: `Market resolved. ${winners.length} winners, ${losers.length} losers.`,
      winners: uniqueWinners.length,
      losers: losers.length
    });

  } catch (error) {
    console.error('💥 RESOLVE MARKET ERROR:', error);
    res.status(500).json({ error: 'Failed to resolve market: ' + error.message });
  }
});

// Freeze market (admin function)
app.post('/api/freeze-market', async (req, res) => {
  try {
    console.log('❄️ FREEZE MARKET REQUEST:', req.body);
    
    if (!db) {
      return res.status(503).json({ error: 'Service temporarily unavailable' });
    }

    const { matchId } = req.body;

    if (!matchId) {
      return res.status(400).json({ error: 'Missing matchId' });
    }

    await db.ref(`matches/${matchId}/status`).set('frozen');

    console.log('✅ MARKET FROZEN:', matchId);

    res.json({ 
      success: true,
      message: 'Market frozen successfully'
    });

  } catch (error) {
    console.error('💥 FREEZE MARKET ERROR:', error);
    res.status(500).json({ error: 'Failed to freeze market: ' + error.message });
  }
});

// ==================== DEBUG ENDPOINTS ====================

// Debug endpoint to see current users and OTPs
app.get('/api/debug/users', (req, res) => {
  res.json({
    users: memoryDB.users.map(u => ({
      id: u.id,
      name: u.name,
      phone: u.phone,
      email: u.email
    })),
    otps: memoryDB.otps,
    currentTime: Date.now()
  });
});

// Debug Firebase data
app.get('/api/debug/firebase', async (req, res) => {
  try {
    if (!db) {
      return res.json({ firebase: 'not_initialized' });
    }

    const usersRef = db.ref('users');
    const matchesRef = db.ref('matches');
    const betsRef = db.ref('bets');

    const [usersSnapshot, matchesSnapshot, betsSnapshot] = await Promise.all([
      usersRef.once('value'),
      matchesRef.once('value'),
      betsRef.once('value')
    ]);

    res.json({
      firebase: 'connected',
      users: usersSnapshot.val() || {},
      matches: matchesSnapshot.val() || {},
      bets: betsSnapshot.val() || {}
    });

  } catch (error) {
    res.json({ 
      firebase: 'error',
      error: error.message 
    });
  }
});

// Simple Firebase test endpoint
app.get('/api/test-firebase', (req, res) => {
  const firebaseVars = {
    hasProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasClientEmail: !!process.env.FIREBASE_CLIENT_EMAIL, 
    hasPrivateKey: !!process.env.FIREBASE_PRIVATE_KEY,
    privateKeyStarts: process.env.FIREBASE_PRIVATE_KEY ? 
      process.env.FIREBASE_PRIVATE_KEY.substring(0, 50) + '...' : 'MISSING'
  };
  res.json(firebaseVars);
});


// Debug environment variables
app.get('/api/test-firebase-init', (req, res) => {
  try {
    console.log('🔄 Testing Firebase initialization...');
    
    // Test if Firebase can initialize
    const firebaseConfig = {
      type: "service_account",
      project_id: "trendbet-c2793",
      private_key_id: "e7865322e05be6ac0bdf34138b5ec5c233628fba",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDRkhhqu2kNDCUc\nxVukGjeflzHtzK4V7/xbgBGxRrPk9Z+31mbXLgKKym/b8H7oFbh3ZqLAhrNuZoXh\noH+yDCjbiwt2u0gpo050Y3iNa2oNIv5cIl5LBQlDQN71/2GrI+n+sZXUA8XOUWwe\nsv/TNTqd6JU3tpAh4qKp4zUhz89k5iVvVL4tHhWEWQBQyHIlko4+BpBSJDtdDpbH\n9f0JTLPAesknDhbYtjcykdNkiJ1ntSwdMAuhx1otlgJXJGMZJ3/SRpccFUYMiG7o\ns8vqRE0PKTP58bRVdWgib5JHm2UL2xkyT2mN061Mt0uoGVpa/wBkJew7OXz8R2BG\nLRAhkIFBAgMBAAECggEACAWcOQrnwF1VuWqr7wlh36/YYH+7rd+ZgaD5+LRwIXla\nYtigmPtkpr+0rfi43fKgvoxgIY3fCGz3TW+tzEKhqg0Vt94SvptuSzbYc7ZH8nvc\nHtZryx8JnUTOHKqkCr94kYKhd2xuxtiHploae0JH4pVZyrh24Xeh25WvzvgjRCzJ\nW1v3doT7bMVQ+gbT8hFppDoWeUITbc5xkbCwBi76QQjbJbFkHB9m7fCxIFbB5Dz/\nAIeyg0HautGFqwpyo46mzy3373WqcKiRWzHcppLhEOHXngdRd9t1d8c4iESnCEBc\nGJUD9ojxL0ON+v1PKY2pTcIKbcRogoNBhOnca4icEQKBgQDrxLAN88pblOuaIg70\nrJdQA+NAY1OhZpNIw9LSEDPX+OdjY6wFYf2tqdSrYbiUECbln0GRbwJR6EFWP7nw\n0FuMQdRkFtkh3kfX7vFdQ44lxo9JU+IiJ0/dVSmm2iflXh6A72NiHMregCQJ3JKf\nY2J7ZF+HSgILIa8piKEFElSuswKBgQDjjec/9+Biz6tsV1AJrI7JmV5pv0hiFXBY\n5euqwi/kedvRTCrHNNz2krst3yeaEg5+goXjnm6zZGP6F9f0EtilgbQCPKYL3C5c\nYIP+ksoY9VjWWKzvDMTCZNzDMbPgVAcR/swaW8deVie2X3V+AuTa34gkN1MgY1z9\nu6ncuoHKOwKBgHEw9PU93iEp1hMh1txRIDQiKbB3/2a1wHBm04hWjw1ZSn3FFIlh\nClGd/6RoPh2Xw5TqaKhSC2MXhobKAZND9S/ZSwbikUxZU1SwOuDz1gL82T3zL9YF\n2aoBgQXCJvVPwoVUaPppqFw6WRMC+sHbDSUAg3yIY4LEoTvnhKbSriVRAoGAByG9\na63TJIWps72QzpzP5NWfteS+2gQd/0tFdZacdaa0Ev02IgQwILI8l5V04klKlwB0\nPcwLYCf3UjFJHWcxzw4fnCpWcey2r0J/II1tNBcMb7tbwCpASG9s09lM7+zyQ8ge\nkXzq5LQCjp6zSf3BOnLjC2+IdW1nzrQBAN//jV0CgYEArV/bGav2II1kT4qQF6uZ\nWMHyfZ5zYxj+mb0iKx6C+P6jUT6oRkPTIMJrpq69weVeuWpnh/uLo5Uu07UyqQnT\n75GFNefHJoREtuohy82FdLIHRZRm9SVxglrjACj8SeUzMJMfrnYcb+69cOsGbBYh\n3k7T3RTSQSXd20bb4e9KN9k=\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@trendbet-c2793.iam.gserviceaccount.com",
      client_id: "106370486515535071439",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40trendbet-c2793.iam.gserviceaccount.com"
    };

    admin.initializeApp({
      credential: admin.credential.cert(firebaseConfig),
      databaseURL: "https://trendbet-c2793-default-rtdb.firebaseio.com"
    });

    const testDb = admin.database();
    res.json({ success: true, message: "Firebase initialized successfully!" });
    
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ==================== ERROR HANDLING ====================

// Error handling
app.use((err, req, res, next) => {
  console.error('💥 SERVER ERROR:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// ==================== SERVER START ====================

const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`🚀 TrendBet Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Local: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network: http://192.168.2.100:${PORT}/api/health`);
  console.log(`🐛 Debug: http://localhost:${PORT}/api/debug/users`);
  console.log(`🔥 Firebase: http://localhost:${PORT}/api/debug/firebase`);
  console.log(`🎯 Betting: ${db ? '✅ Enabled' : '❌ Disabled'}`);
});
