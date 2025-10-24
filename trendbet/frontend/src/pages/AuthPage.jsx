import React, { useState, useEffect } from 'react';
import { useAuth } from "../context/AuthContext.js";

const AuthPage = () => {
  const { 
    user, 
    register, 
    login, 
    verifyRegistrationOtp, 
    verifyLoginOtp, 
    resendOtp,
    getPendingAuthData 
  } = useAuth();
  
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1); // 1: credentials, 2: OTP
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    otp: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login flow
        await login(formData.phone, formData.password);
        setStep(2);
      } else {
        // Registration flow
        await register(formData.name, formData.phone, formData.email, formData.password);
        setStep(2);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const pendingData = getPendingAuthData();
      
      if (isLogin) {
        await verifyLoginOtp(pendingData.phone, formData.otp);
      } else {
        await verifyRegistrationOtp(pendingData.phone, formData.otp, pendingData.userId);
      }
      
      // Redirect on success
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      const pendingData = getPendingAuthData();
      const type = isLogin ? 'login' : 'registration';
      await resendOtp(pendingData.phone, type);
      alert('OTP resent successfully!');
    } catch (err) {
      alert('Failed to resend OTP: ' + err.message);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      phone: '',
      email: '',
      password: '',
      otp: ''
    });
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {step === 1 ? (isLogin ? 'Welcome Back' : 'Join TrendBet') : 'Verify OTP'}
          </h1>
          <p className="text-gray-600">
            {step === 1 
              ? (isLogin ? 'Sign in to your account' : 'Create your account to start betting')
              : 'Enter the OTP sent to your phone'
            }
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleCredentialsSubmit}>
            {!isLogin && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            )}

            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., 0712345678"
                required
              />
            </div>

            {!isLogin && (
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                  required
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200"
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-medium mb-2">
                OTP Code
              </label>
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => setFormData({ ...formData, otp: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl font-mono"
                placeholder="000000"
                maxLength={6}
                required
              />
              <p className="text-sm text-gray-600 mt-2">
                Enter the 6-digit code sent to your phone
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition duration-200 mb-3"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={handleResendOtp}
              className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition duration-200"
            >
              Resend OTP
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                resetForm();
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center mt-6">
            <button
              type="button"
              onClick={resetForm}
              className="text-gray-600 hover:text-gray-800 font-medium"
            >
              ← Back to {isLogin ? 'Sign In' : 'Sign Up'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPage;
