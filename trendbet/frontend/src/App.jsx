// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { FourSquare } from 'react-loading-indicators';
import AuthPage from "./pages/AuthPage.jsx";
import HomePage from "./pages/HomePage.jsx";
import CategoriesPage from "./pages/CategoriesPage.jsx";
import SearchPage from "./pages/SearchPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

import TopNav from "./components/TopNav.jsx";
import BottomNav from "./components/BottomNav.jsx";

import "./App.css";

function PrivateRoute({ element }) {
  const { user } = useAuth();
  return user ? element : <Navigate to="/auth" replace />;
}

function AppContent() {
  const { user, loading } = useAuth();

if (loading) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      backgroundColor: "#0f172a",
      gap: "20px"
    }}>
      <FourSquare 
        color="#3b82f6" 
        size="medium" 
        text="" 
        textColor=""
      />
      <div style={{ 
        color: '#94a3b8',
        fontSize: '16px',
        fontWeight: '500'
      }}>
        Loading TrendBet...
      </div>
    </div>
  );
}

  return (
    <Router>
      <TopNav />
      <div
        style={{
          backgroundColor: "#0f172a",
          color: "white",
          minHeight: "100vh",
          paddingTop: "56px",
          paddingBottom: "60px",
        }}
      >
        <Routes>
          {/* Public route */}
          <Route path="/" element={<HomePage />} />

          {/* Auth route */}
          <Route path="/auth" element={<AuthPage />} />

          {/* Protected routes */}
          <Route path="/categories" element={<PrivateRoute element={<CategoriesPage />} />} />
          <Route path="/search" element={<PrivateRoute element={<SearchPage />} />} />
          <Route path="/profile" element={<PrivateRoute element={<ProfilePage />} />} />
          <Route path="/admin" element={<PrivateRoute element={<AdminDashboard />} />} />

          {/* Redirect unknown paths */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
