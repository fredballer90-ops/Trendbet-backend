import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const OTPVerification = () => {
  const { 
    loading, 
    tempData, 
    verifyOTP, 
    resendOTP, 
    closeOTP,
    authStep 
  } = useAuth();
  
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (authStep === 'otp') {
      startCountdown();
      // Focus first input when OTP modal opens
      setTimeout(() => {
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }, 100);
    }
  }, [authStep]);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1].focus();
    }

    // Auto-submit when all digits are filled (but only if not already submitting)
    if (newOtp.every(digit => digit !== '') && index === 5 && !isSubmitting) {
      handleSubmit(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace
        inputRefs.current[index - 1].focus();
      } else if (otp[index]) {
        // Clear current input on backspace
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const pastedDigits = pastedData.replace(/\D/g, '').split('').slice(0, 6);
    
    if (pastedDigits.length === 6) {
      const newOtp = [...otp];
      pastedDigits.forEach((digit, index) => {
        newOtp[index] = digit;
      });
      setOtp(newOtp);
      
      // Focus the last input
      inputRefs.current[5].focus();
    }
  };

  const handleSubmit = async (submittedOtp = otp.join('')) => {
    if (submittedOtp.length !== 6) {
      setMessage('Please enter all 6 digits');
      return;
    }

    if (isSubmitting) {
      return; // Prevent multiple submissions
    }

    setIsSubmitting(true);
    setMessage('');

    console.log('🔐 Submitting OTP for verification:', {
      phone: tempData?.phone,
      otp: submittedOtp,
      type: tempData?.type
    });

    try {
      const result = await verifyOTP(submittedOtp);
      
      if (!result.success) {
        setMessage(result.error);
        // Clear OTP on error but keep focus
        setOtp(['', '', '', '', '', '']);
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }
      }
      // If successful, the OTP modal will close automatically
    } catch (error) {
      console.error('OTP submission error:', error);
      setMessage('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (countdown > 0) return;

    setMessage('');
    const result = await resendOTP();
    
    if (result.success) {
      setMessage('OTP resent successfully');
      startCountdown();
      
      // Clear current OTP and refocus
      setOtp(['', '', '', '', '', '']);
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    } else {
      setMessage(result.error);
    }
  };

  if (authStep !== 'otp') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        padding: '30px',
        borderRadius: '12px',
        border: '1px solid #334155',
        width: '100%',
        maxWidth: '400px',
        position: 'relative'
      }}>
        {/* Close button */}
        <button
          onClick={closeOTP}
          style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '20px',
            cursor: 'pointer',
            width: '30px',
            height: '30px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          ×
        </button>

        <h2 style={{ 
          textAlign: 'center', 
          marginBottom: '16px', 
          color: 'white' 
        }}>
          Verify OTP
        </h2>

        <p style={{ 
          textAlign: 'center', 
          color: '#94a3b8', 
          marginBottom: '24px',
          fontSize: '14px'
        }}>
          Enter the 6-digit code sent to<br />
          <strong style={{ color: 'white' }}>{tempData?.phone}</strong>
        </p>

        {/* OTP Input Fields */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '24px',
          gap: '8px'
        }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={isSubmitting}
              style={{
                width: '45px',
                height: '55px',
                textAlign: 'center',
                fontSize: '20px',
                fontWeight: 'bold',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: isSubmitting ? '#374151' : '#0f172a',
                color: 'white',
                outline: 'none',
                cursor: isSubmitting ? 'not-allowed' : 'text'
              }}
              autoFocus={index === 0}
            />
          ))}
        </div>

        {/* Debug OTP Display (only in development) */}
        {tempData?.debugOtp && (
          <div style={{
            padding: '12px',
            backgroundColor: '#0f172a',
            borderRadius: '6px',
            marginBottom: '16px',
            textAlign: 'center'
          }}>
            <div style={{ 
              fontSize: '12px', 
              color: '#94a3b8',
              marginBottom: '4px'
            }}>
              Development OTP:
            </div>
            <div style={{ 
              fontSize: '16px', 
              color: '#3b82f6',
              fontWeight: 'bold',
              letterSpacing: '2px'
            }}>
              {tempData.debugOtp}
            </div>
          </div>
        )}

        {/* Manual Verify Button */}
        <button
          onClick={() => handleSubmit()}
          disabled={loading || isSubmitting || otp.join('').length !== 6}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: loading || isSubmitting || otp.join('').length !== 6 ? '#64748b' : '#3b82f6',
            color: 'white',
            fontSize: '16px',
            fontWeight: '500',
            cursor: loading || isSubmitting || otp.join('').length !== 6 ? 'not-allowed' : 'pointer',
            marginBottom: '12px'
          }}
        >
          {loading || isSubmitting ? 'Verifying...' : 'Verify OTP'}
        </button>

        {/* Resend OTP */}
        <div style={{ textAlign: 'center' }}>
          <button
            onClick={handleResendOTP}
            disabled={countdown > 0 || isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: countdown > 0 || isSubmitting ? '#64748b' : '#3b82f6',
              cursor: countdown > 0 || isSubmitting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              textDecoration: 'underline'
            }}
          >
            {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
          </button>
        </div>

        {message && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            backgroundColor: message.includes('sent') || message.includes('success') ? '#10b981' : '#ef4444',
            color: 'white',
            textAlign: 'center',
            fontSize: '14px',
            marginTop: '16px'
          }}>
            {message}
          </div>
        )}

        <div style={{
          marginTop: '20px',
          padding: '12px',
          backgroundColor: '#0f172a',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#94a3b8',
          textAlign: 'center'
        }}>
          {isSubmitting ? 'Verifying OTP...' : 'Enter the 6-digit verification code'}
        </div>
      </div>
    </div>
  );
};

export default OTPVerification;
