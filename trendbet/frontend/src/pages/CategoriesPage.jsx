import React, { useState, useEffect } from "react";
import { FaFire, FaLandmark, FaMusic, FaFutbol, FaBolt } from "react-icons/fa";
import MarketCard from "../components/MarketCard";
import { FourSquare } from 'react-loading-indicators';

const CategoriesPage = ({ onShowBetSlip }) => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: "all", name: "All Categories", icon: <FaFire /> },
    { id: "politics", name: "Politics", icon: <FaLandmark /> },
    { id: "entertainment", name: "Entertainment", icon: <FaMusic /> },
    { id: "sports", name: "Sports", icon: <FaFutbol /> },
    { id: "breaking", name: "Breaking News", icon: <FaBolt /> },
  ];

  useEffect(() => {
    const marketsRef = ref(db, "markets");
    
    const unsubscribe = onValue(marketsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const marketsList = Object.entries(data).map(([id, market]) => ({
          id,
          ...market,
          volume: market.volume || '0',
          resolution: market.resolution || market.description || 'Official results',
        }));
        setMarkets(marketsList);
      } else {
        setMarkets([]);
      }
      setLoading(false);
    });

    return () => off(marketsRef, "value", unsubscribe);
  }, []);

  const filteredMarkets =
    selectedCategory === "all"
      ? markets.filter(market => market.status === 'open')
      : markets.filter((m) => m.category === selectedCategory && m.status === 'open');

if (loading) {
    return (
      <div style={{
        paddingTop: '0px',
        paddingBottom: '60px',
        width: '100%',
        backgroundColor: '#0f172a',
        minHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
      }}>
        <FourSquare color="#3b82f6" size="medium" />
        <div style={{ color: '#94a3b8', fontSize: '16px'}} >
          Loading Categories...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: "#0f172a",
        minHeight: "100vh",
        paddingTop: "0px",
        paddingBottom: "60px",
        color: "#f1f5f9",
      }}
    >
      {/* Category Selector */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "10px",
          padding: "16px",
        }}
      >
        {categories.map((category) => (
          <div
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "10px",
              borderRadius: "10px",
              backgroundColor:
                selectedCategory === category.id ? "#3b82f6" : "#1e293b",
              color:
                selectedCategory === category.id ? "#ffffff" : "#94a3b8",
              cursor: "pointer",
              transition: "all 0.2s ease",
              border: "1px solid #334155",
              fontSize: "13px",
              fontWeight: 500,
            }}
          >
            <div style={{ fontSize: "20px", marginBottom: "4px" }}>
              {category.icon}
            </div>
            {category.name}
          </div>
        ))}
      </div>

      {/* Market List */}
      <div style={{ padding: "0 16px 20px 16px" }}>
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "600",
            marginBottom: "16px",
            color: selectedCategory === "all" ? "#f1f5f9" : "#3b82f6",
          }}
        >
          {selectedCategory === "all"
            ? "All Markets"
            : categories.find((c) => c.id === selectedCategory)?.name}
          <span
            style={{
              fontSize: "14px",
              color: "#94a3b8",
              fontWeight: "normal",
              marginLeft: "8px",
            }}
          >
            ({filteredMarkets.length} markets)
          </span>
        </h3>

        {filteredMarkets.length > 0 ? (
          filteredMarkets.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onShowBetSlip={onShowBetSlip}
            />
          ))
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#94a3b8",
            }}
          >
            No markets found in this category
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoriesPage;
