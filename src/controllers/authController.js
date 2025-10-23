const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const OTPService = require('../services/otpService');

exports.register = async (req, res) => {
  try {
    const { email, phone, password, name } = req.body;

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: passwordValidation.error
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { phone }] 
    });
    
    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email or phone already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password
    });

    // Generate and send OTP for phone verification
    const otp = await OTPService.generateOTP(phone, 'phone');
    await OTPService.sendSMSOTP(phone, otp.code);

    res.status(201).json({
      message: 'User registered successfully. OTP sent to phone.',
      userId: user._id,
      // Only in development - remove in production
      ...(process.env.NODE_ENV === 'development' && { debugOtp: otp.code })
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { identifier, password } = req.body; // identifier can be email or phone
    
    const user = await User.findOne({ 
      $or: [{ email: identifier }, { phone: identifier }] 
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate and send OTP for login verification
    const otp = await OTPService.generateOTP(user.phone, 'phone');
    await OTPService.sendSMSOTP(user.phone, otp.code);

    res.json({
      message: 'OTP sent to your phone for verification',
      userId: user._id,
      requiresOtp: true,
      // Only in development - remove in production
      ...(process.env.NODE_ENV === 'development' && { debugOtp: otp.code })
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyLoginOTP = async (req, res) => {
  try {
    const { phone, otpCode } = req.body;

    const isValid = await OTPService.verifyOTP(phone, otpCode);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Get user and generate JWT token
    const user = await User.findOne({ phone });
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.verifyRegistrationOTP = async (req, res) => {
  try {
    const { phone, otpCode, userId } = req.body;

    const isValid = await OTPService.verifyOTP(phone, otpCode);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Update user as verified and generate JWT
    await User.findByIdAndUpdate(userId, { 
      phoneVerified: true 
    });

    const user = await User.findById(userId);
    const token = jwt.sign(
      { userId: user._id }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Password validation helper
function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (password.length < minLength) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (!hasUpperCase) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!hasLowerCase) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!hasNumbers) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!hasSpecialChar) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  
  return { valid: true };
}
