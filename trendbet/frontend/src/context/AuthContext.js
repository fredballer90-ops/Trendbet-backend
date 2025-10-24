// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../utils/api.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in on app start
    checkAuthStatus();
  }, []);

  // ✅ Check authentication status
  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        // You might want to add a /api/auth/me endpoint to verify token and get user data
        // For now, we'll assume the token is valid and try to get user data from other endpoints
        await fetchUserData();
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("authToken");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch user data after login
  const fetchUserData = async () => {
    try {
      // You'll need to create these endpoints in your backend
      // For now, we'll set a placeholder user
      setUser({
        uid: "user-id",
        email: localStorage.getItem("userEmail") || "user@example.com",
        displayName: "User",
      });
      
      // Check admin status - you'll need to implement this endpoint
      // const adminCheck = await api.get('/api/user/admin-status');
      // setIsAdmin(adminCheck.data.isAdmin);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    }
  };

  // ✅ Register user
  const register = async (email, password, phoneNumber) => {
    try {
      const response = await api.post("/api/auth/register", {
        email,
        password,
        phoneNumber,
      });
      
      localStorage.setItem("pendingEmail", email);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Registration failed");
    }
  };

  // ✅ Verify registration OTP
  const verifyRegistrationOtp = async (email, otp) => {
    try {
      const response = await api.post("/api/auth/verify-registration-otp", {
        email,
        otp,
      });
      
      const { token, user } = response.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("userEmail", user.email);
      localStorage.removeItem("pendingEmail");
      
      setUser(user);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "OTP verification failed");
    }
  };

  // ✅ Login user
  const login = async (email) => {
    try {
      const response = await api.post("/api/auth/login", { email });
      localStorage.setItem("pendingEmail", email);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Login failed");
    }
  };

  // ✅ Verify login OTP
  const verifyLoginOtp = async (email, otp) => {
    try {
      const response = await api.post("/api/auth/verify-login-otp", {
        email,
        otp,
      });
      
      const { token, user } = response.data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("userEmail", user.email);
      localStorage.removeItem("pendingEmail");
      
      setUser(user);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "OTP verification failed");
    }
  };

  // ✅ Resend OTP
  const resendOtp = async (email) => {
    try {
      const response = await api.post("/api/otp/resend", { email });
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || "Failed to resend OTP");
    }
  };

  // ✅ Logout function
  const logout = async () => {
    try {
      // Optional: Call backend logout endpoint if you have one
      // await api.post('/api/auth/logout');
      
      localStorage.removeItem("authToken");
      localStorage.removeItem("userEmail");
      localStorage.removeItem("pendingEmail");
      
      setUser(null);
      setIsAdmin(false);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAdmin,
        loading,
        register,
        login,
        verifyRegistrationOtp,
        verifyLoginOtp,
        resendOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
