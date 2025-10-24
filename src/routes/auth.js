const express = require('express');
const {
  register,
  login,
  verifyLoginOTP,
  verifyRegistrationOTP,
  resendOtp
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-login-otp', verifyLoginOTP);
router.post('/verify-registration-otp', verifyRegistrationOTP);
router.post('/resend-otp', resendOtp);

module.exports = router;
