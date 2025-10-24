// src/components/TopNav.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FaChartLine, FaUserCircle, FaSignOutAlt, FaSignInAlt, FaUserPlus } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.js";

const TopNav = () => {
  const { user, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Toggle profile dropdown
  const handleProfileClick = () => {
    setShowMenu((prev) => !prev);
  };

  // Hide menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Safely handle logout
  const handleLogout = async () => {
    if (typeof logout === "function") {
      await logout();
      navigate("/");
    } else {
      console.error("logout function not found in AuthContext");
    }
    setShowMenu(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "56px",
        backgroundColor: "#1e293b",
        borderBottom: "1px solid #334155",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        zIndex: 1000,
        boxShadow: "0 2px 6px rgba(0,0,0,0.4)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          cursor: "pointer",
        }}
        onClick={() => navigate("/")}
      >
        <FaChartLine size={22} color="#3b82f6" />
        <span
          style={{
            color: "white",
            fontWeight: "bold",
            fontSize: "18px",
          }}
        >
          TrendBet
        </span>
      </div>

      {/* User Section */}
      <div style={{ position: "relative" }} ref={menuRef}>
        {user ? (
          <>
            <FaUserCircle
              size={26}
              color="#94a3b8"
              style={{ cursor: "pointer" }}
              onClick={handleProfileClick}
            />

            {showMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "42px",
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "10px",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
                  padding: "8px 0",
                  width: "150px",
                  animation: "fadeIn 0.25s ease forwards",
                }}
              >
                <button
                  onClick={() => {
                    navigate("/profile");
                    setShowMenu(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <FaUserCircle size={14} /> Profile
                </button>

                <button
                  onClick={handleLogout}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#f87171",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    width: "100%",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <FaSignOutAlt size={14} /> Logout
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: "flex", gap: "14px", alignItems: "center" }}>
            <button
              onClick={() => navigate("/auth")}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                cursor: "pointer",
              }}
            >
              <FaSignInAlt size={14} /> Login
            </button>
            <button
              onClick={() => navigate("/auth")}
              style={{
                backgroundColor: "#3b82f6",
                border: "none",
                color: "white",
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                borderRadius: "6px",
                padding: "6px 12px",
                cursor: "pointer",
              }}
            >
              <FaUserPlus size={14} /> Sign Up
            </button>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default TopNav;
