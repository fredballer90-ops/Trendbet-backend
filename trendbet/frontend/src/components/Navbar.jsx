// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-green-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-xl font-bold">TrendBet</span>
          </Link>

          {/* Navigation Links */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="hover:text-green-200 transition">
              Home
            </Link>
            <Link to="/events" className="hover:text-green-200 transition">
              Events
            </Link>
            
            {user ? (
              <>
                <Link to="/dashboard" className="hover:text-green-200 transition">
                  Dashboard
                </Link>
                {user.role === 'admin' && (
                  <Link to="/admin" className="hover:text-green-200 transition">
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <span className="text-green-200">
                    KSH {user.balance?.toLocaleString()}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="bg-green-700 px-4 py-2 rounded-lg hover:bg-green-800 transition"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link 
                  to="/login" 
                  className="hover:text-green-200 transition"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-green-700 px-4 py-2 rounded-lg hover:bg-green-800 transition"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
