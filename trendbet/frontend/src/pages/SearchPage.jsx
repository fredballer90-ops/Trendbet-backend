import React, { useState, useEffect } from "react";
import { FaSearch, FaHistory, FaFireAlt } from "react-icons/fa";
import MarketCard from "../components/MarketCard";
import { FourSquare } from 'react-loading-indicators';

const SearchPage = ({ onShowBetSlip }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentSearches, setRecentSearches] = useState([
    "Politics",
    "Elections",
    "Sports",
    "Entertainment",
    "Economy",
  ]);

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

  const searchResults = markets.filter(
    (market) => 
      market.status === 'open' && (
        market.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        market.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (market.resolution && market.resolution.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (market.description && market.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )
  );

  const addToRecentSearches = (term) => {
    if (term && !recentSearches.includes(term)) {
      setRecentSearches((prev) => [term, ...prev.slice(0, 4)]);
    }
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    addToRecentSearches(term);
  };




if (loading) {
  return (
    <div
      style={{
        position: 'fixed',           // stay in the same place on screen
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0f172a',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: '20px',
        zIndex: 9999,                // make sure it sits above everything
      }}
    >
      <FourSquare color="#3b82f6" size={2} />
      <div style={{ color: '#94a3b8', fontSize: '16px' }}>
        Loading SearchPage...
      </div>
    </div>
  );
}

  return (
    <div style={{ padding: "20px", backgroundColor: '#0f172a', minHeight: '100vh' }}>
      {/* Search Bar */}
      <div
        style={{
          backgroundColor: "#1e293b",
          borderRadius: "10px",
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "20px",
          border: "1px solid #334155",
        }}
      >
        <FaSearch size={18} color="#94a3b8" />
        <input
          type="text"
          placeholder="Search events, categories, or resolutions..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "#f1f5f9",
            fontSize: "15px",
            outline: "none",
            flex: 1,
          }}
        />
      </div>

      {/* Recent Searches */}
      {searchTerm === "" && (
        <div>
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              marginBottom: "10px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaHistory size={14} /> Recent Searches
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "18px",
            }}
          >
            {recentSearches.map((search, index) => (
              <div
                key={index}
                onClick={() => handleSearch(search)}
                style={{
                  backgroundColor: "#334155",
                  padding: "6px 12px",
                  borderRadius: "16px",
                  fontSize: "13px",
                  cursor: "pointer",
                  color: "#cbd5e1",
                  transition: "background-color 0.2s ease",
                }}
              >
                {search}
              </div>
            ))}
          </div>

          {/* Popular Categories */}
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              marginBottom: "10px",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaFireAlt size={14} color="#f87171" /> Popular Categories
          </h3>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            {["Politics", "Sports", "Entertainment", "Economy", "Elections"].map(
              (category, index) => (
                <div
                  key={index}
                  onClick={() => handleSearch(category)}
                  style={{
                    backgroundColor: "#3b82f6",
                    color: "white",
                    padding: "6px 14px",
                    borderRadius: "16px",
                    fontSize: "13px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  {category}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div>
        {searchTerm && (
          <h3
            style={{
              fontSize: "15px",
              fontWeight: "600",
              marginBottom: "14px",
              color: "#f1f5f9",
            }}
          >
            {searchResults.length} results for "{searchTerm}"
          </h3>
        )}

        {searchResults.length > 0 ? (
          searchResults.map((market) => (
            <MarketCard
              key={market.id}
              market={market}
              onShowBetSlip={onShowBetSlip}
            />
          ))
        ) : searchTerm ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "#94a3b8",
            }}
          >
            No results found for "{searchTerm}"
            <div style={{ marginTop: "10px", fontSize: "14px" }}>
              Try searching for: politics, sports, entertainment, or economy
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default SearchPage;
