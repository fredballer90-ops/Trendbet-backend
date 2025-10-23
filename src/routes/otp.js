const express = require('express');
const OTPService = require('../services/otpService');

const router = express.Router();

router.post('/send', async (req, res) => {
  try {
    const { emailOrPhone, type } = req.body;
    
    const otp = await OTPService.generateOTP(emailOrPhone, type);
    let sent = false;
    
    if (type === 'phone') {
      sent = await OTPService.sendSMSOTP(emailOrPhone, otp.code);
    } else {
      sent = await OTPService.sendEmailOTP(emailOrPhone, otp.code);
    }

    if (sent) {
      res.json({ 
        message: `OTP sent to your ${type}`,
        ...(process.env.NODE_ENV === 'development' && { debugCode: otp.code })
      });
    } else {
      res.status(500).json({ error: 'Failed to send OTP' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/resend', async (req, res) => {
  try {
    const { emailOrPhone, type } = req.body;
    
    const otp = await OTPService.generateOTP(emailOrPhone, type);
    let sent = false;
    
    if (type === 'phone') {
      sent = await OTPService.sendSMSOTP(emailOrPhone, otp.code);
    } else {
      sent = await OTPService.sendEmailOTP(emailOrPhone, otp.code);
    }

    if (sent) {
      res.json({ 
        message: `OTP resent to your ${type}`,
        ...(process.env.NODE_ENV === 'development' && { debugCode: otp.code })
      });
    } else {
      res.status(500).json({ error: 'Failed to resend OTP' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
