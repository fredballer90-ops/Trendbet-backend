// backend/src/models/OTP.js
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  emailOrPhone: { type: String, required: true },
  code: { type: String, required: true },
  type: { type: String, enum: ['phone', 'email'], required: true },
  expiresAt: { type: Date, required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0 }
}, { timestamps: true });

// Auto-delete expired OTPs after 1 hour
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 3600 });

module.exports = mongoose.model('OTP', otpSchema);
