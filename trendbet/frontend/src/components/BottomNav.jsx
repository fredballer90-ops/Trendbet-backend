import React from "react";
import { FaHome, FaThList, FaSearch, FaUser } from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { id: "home", label: "Home", icon: <FaHome />, path: "/" },
    { id: "categories", label: "Categories", icon: <FaThList />, path: "/categories" },
    { id: "search", label: "Search", icon: <FaSearch />, path: "/search" },
    { id: "profile", label: "Profile", icon: <FaUser />, path: "/profile" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: "#1e293b",
        borderTop: "1px solid #334155",
        display: "flex",
        justifyContent: "space-around",
        padding: "8px 0",
        zIndex: 100,
      }}
    >
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              background: "none",
              border: "none",
              color: isActive ? "#3b82f6" : "#94a3b8",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            <span style={{ fontSize: "20px", marginBottom: "2px" }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </div>
  );
};

export default BottomNav;
