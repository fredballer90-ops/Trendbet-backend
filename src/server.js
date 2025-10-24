import express from "express";
import cors from "cors";
import admin from "./config/firebase.js";
const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.2.100:3000'],
  credentials: true
}));
app.use(express.json());

const db = admin.database();

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

// Firebase helper functions
const firebaseHelpers = {
  // Get user by email
  async getUserByEmail(email) {
    try {
      const usersRef = db.ref('users');
      const snapshot = await usersRef.orderByChild('email').equalTo(email.toLowerCase()).once('value');
      const users = snapshot.val();
      return users ? Object.values(users)[0] : null;
    } catch (error) {
      console.error('Firebase error:', error);
      return null;
    }
  },

  // Create user
  async createUser(userData) {
    try {
      const usersRef = db.ref('users');
      const newUserRef = usersRef.push();
      await newUserRef.set({
        ...userData,
        id: newUserRef.key,
        createdAt: new Date().toISOString()
      });
      return { ...userData, id: newUserRef.key };
    } catch (error) {
      throw error;
    }
  },

  // Store OTP
  async storeOTP(email, otpCode, type) {
    try {
      const otpRef = db.ref('otps').push();
      await otpRef.set({
        email: email.toLowerCase(),
        code: otpCode,
        type,
        expiresAt: Date.now() + 600000,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      throw error;
    }
  },

  // Verify OTP
  async verifyOTP(email, otpCode, type) {
    try {
      const otpsRef = db.ref('otps');
      const snapshot = await otpsRef.orderByChild('email').equalTo(email.toLowerCase()).once('value');
      const otps = snapshot.val();
      
      if (!otps) return false;

      for (const [key, otp] of Object.entries(otps)) {
        if (otp.code === otpCode && otp.type === type && otp.expiresAt > Date.now()) {
          // Delete used OTP
          await db.ref(`otps/${key}`).remove();
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('OTP verification error:', error);
      return false;
    }
  },

  // Get user by ID
  async getUserById(userId) {
    try {
      const userRef = db.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Firebase getUserById error:', error);
      return null;
    }
  }
};

// ---------- HEALTH ----------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'TrendBet API with Firebase Auth is running!',
    database: 'Firebase Realtime Database',
    timestamp: new Date().toISOString(),
    clientIP: req.ip
  });
});

// ---------- AUTH (EMAIL-ONLY with FIREBASE) ----------
app.post('/api/auth/register', async (req, res) => {
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

    // Check if user already exists by email in Firebase
    const existingUser = await firebaseHelpers.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user in Firebase
    const user = await firebaseHelpers.createUser({
      name,
      email: email.toLowerCase(),
      password, // Note: In production, you should hash this!
      balance: 1000,
      totalWagered: 0,
      totalWinnings: 0,
      role: 'user',
      emailVerified: false
    });

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await firebaseHelpers.storeOTP(email, otp, 'registration');

    console.log('✅ USER CREATED IN FIREBASE:', { id: user.id, email: user.email });
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

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 LOGIN REQUEST:', JSON.stringify(req.body, null, 2));
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = identifier.toLowerCase().trim();
    
    // Find user in Firebase
    const user = await firebaseHelpers.getUserByEmail(cleanEmail);
    if (!user) return res.status(401).json({ success: false, error: 'User not found' });
    
    // Check password (in production, use hashing!)
    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    // Generate OTP for email verification
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await firebaseHelpers.storeOTP(user.email, otp, 'login');

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

app.post('/api/auth/verify-login-otp', async (req, res) => {
  try {
    const { email, otpCode } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP in Firebase
    const isValid = await firebaseHelpers.verifyOTP(cleanEmail, otpCode, 'login');
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    // Get user from Firebase
    const user = await firebaseHelpers.getUserByEmail(cleanEmail);
    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    const token = `token-${Date.now()}-${user.id}`;

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

app.post('/api/auth/verify-registration-otp', async (req, res) => {
  try {
    const { email, otpCode, userId } = req.body;
    const cleanEmail = email.toLowerCase().trim();

    // Verify OTP in Firebase
    const isValid = await firebaseHelpers.verifyOTP(cleanEmail, otpCode, 'registration');
    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid or expired OTP' });
    }

    // Update user as verified in Firebase
    await db.ref(`users/${userId}`).update({ emailVerified: true });
    
    // Get updated user
    const user = await firebaseHelpers.getUserById(userId);
    if (!user) return res.status(400).json({ success: false, error: 'User not found' });

    const token = `token-${Date.now()}-${user.id}`;

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

app.post('/api/otp/resend', async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email || !type) return res.status(400).json({ error: 'Email and type are required' });

    const cleanEmail = email.toLowerCase().trim();

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await firebaseHelpers.storeOTP(cleanEmail, otp, type);

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

// Keep the rest of your routes (bets, admin, etc.) as they are...

// ---------- DEBUG ----------
app.get('/api/debug/users', async (req, res) => {
  try {
    const usersRef = db.ref('users');
    const snapshot = await usersRef.once('value');
    const users = snapshot.val() || {};
    
    return res.json({
      users: Object.values(users),
      totalUsers: Object.keys(users).length,
      currentTime: Date.now()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Server start
const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

app.get("/", (req, res) => res.status(200).send("✅ TrendBet backend with Firebase Auth is live"));

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 TrendBet Server running on http://${HOST}:${PORT}`);
  console.log(`📊 Local: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Network: http://192.168.2.100:${PORT}/api/health`);
  console.log(`🔥 Firebase: ✅ Enabled for Authentication`);
  console.log(`📧 AUTH: Email-only authentication with Firebase`);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
