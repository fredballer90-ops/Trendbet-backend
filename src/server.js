import express from "express";
import cors from "cors";
import admin from "./config/firebase.js";

const app = express();

app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://192.168.2.100:3000', 'https://your-frontend.onrender.com'],
  credentials: true
}));
app.use(express.json());

const db = admin ? admin.database() : null;

// Request logging
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`, {
    body: req.body,
    hostname: req.hostname
  });
  next();
});

// Firebase helper functions
const firebaseHelpers = {
  async getUserByEmail(email) {
    if (!db) throw new Error('Firebase not initialized');
    
    try {
      const usersRef = db.ref('users');
      const snapshot = await usersRef.orderByChild('email').equalTo(email.toLowerCase()).once('value');
      const users = snapshot.val();
      if (users) {
        const userId = Object.keys(users)[0];
        return { ...users[userId], id: userId };
      }
      return null;
    } catch (error) {
      console.error('Firebase getUserByEmail error:', error);
      throw error;
    }
  },

  async createUser(userData) {
    if (!db) throw new Error('Firebase not initialized');
    
    try {
      const usersRef = db.ref('users');
      const newUserRef = usersRef.push();
      await newUserRef.set({
        ...userData,
        createdAt: new Date().toISOString(),
        emailVerified: false
      });
      return { ...userData, id: newUserRef.key };
    } catch (error) {
      console.error('Firebase createUser error:', error);
      throw error;
    }
  },

  async storeOTP(email, otpCode, type) {
    if (!db) throw new Error('Firebase not initialized');
    
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
      console.error('Firebase storeOTP error:', error);
      throw error;
    }
  },

  async verifyOTP(email, otpCode, type) {
    if (!db) throw new Error('Firebase not initialized');
    
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
      console.error('Firebase verifyOTP error:', error);
      throw error;
    }
  },

  async getUserById(userId) {
    if (!db) throw new Error('Firebase not initialized');
    
    try {
      const userRef = db.ref(`users/${userId}`);
      const snapshot = await userRef.once('value');
      const user = snapshot.val();
      return user ? { ...user, id: userId } : null;
    } catch (error) {
      console.error('Firebase getUserById error:', error);
      throw error;
    }
  }
};

// ---------- HEALTH ----------
app.get('/api/health', async (req, res) => {
  try {
    let userCount = 0;
    if (db) {
      const usersRef = db.ref('users');
      const snapshot = await usersRef.once('value');
      userCount = snapshot.numChildren();
    }

    res.json({
      status: 'OK',
      message: 'TrendBet API with Firebase RTDB is running!',
      database: db ? 'Firebase Realtime Database' : 'No Database',
      usersCount: userCount,
      firebaseStatus: db ? '✅ Connected' : '❌ Disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.json({
      status: 'OK',
      message: 'TrendBet API is running (Firebase error)',
      database: 'Firebase (Connection Issue)',
      firebaseStatus: '❌ Connection Error',
      timestamp: new Date().toISOString()
    });
  }
});

// ---------- AUTH (EMAIL-ONLY with FIREBASE) ----------
app.post('/api/auth/register', async (req, res) => {
  try {
    console.log('📧 REGISTRATION REQUEST:', req.body);
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    // Check if user exists
    const existingUser = await firebaseHelpers.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create user
    const user = await firebaseHelpers.createUser({
      name,
      email: email.toLowerCase(),
      password, // Note: Hash this in production!
      balance: 1000,
      totalWagered: 0,
      totalWinnings: 0,
      role: 'user',
      emailVerified: false
    });

    // Generate OTP
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
    return res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    console.log('🔐 LOGIN REQUEST:', req.body);
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }

    const cleanEmail = identifier.toLowerCase().trim();
    const user = await firebaseHelpers.getUserByEmail(cleanEmail);

    if (!user) {
      console.log('❌ User not found:', cleanEmail);
      return res.status(401).json({ error: 'User not found' });
    }

    // Check password (hash in production!)
    if (user.password !== password) {
      console.log('❌ Invalid password for:', cleanEmail);
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate OTP
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
    return res.status(500).json({ error: 'Login failed: ' + error.message });
  }
});

// Add your other routes (OTP verification, bets, etc.) here...

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🚀 TrendBet Server running on port ${PORT}`);
  console.log(`🔥 Firebase Status: ${db ? '✅ Connected' : '❌ Disconnected'}`);
  console.log(`📧 AUTH: Email-only authentication`);
});
