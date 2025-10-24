import React, { useEffect, useState } from "react";
import api from '../../utils/api';

export default function EventManager() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("🔄 EventManager: Starting API connection...");
    fetchMarkets();
  }, []);

  const fetchMarkets = async () => {
    try {
      setLoading(true);
      console.log("✅ EventManager: Fetching markets from API...");

      const response = await api.get('/api/admin/markets');
      console.log("API Response:", response.data);

      if (response.data.success) {
        const marketsList = response.data.markets || [];
        console.log(`📊 Processed ${marketsList.length} markets`);
        setMarkets(marketsList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      } else {
        console.log("❌ No markets data found in API response");
        setMarkets([]);
      }
      setLoading(false);
      setError(null);
    } catch (error) {
      console.error("❌ EventManager: API error:", error);
      setError(error.response?.data?.error || error.message);
      setLoading(false);
      setMarkets([]);
    }
  };

  const setResult = async (id, result) => {
    try {
      console.log(`🎯 Resolving market ${id} as ${result}`);
      const response = await api.post('/api/admin/resolve-market', {
        marketId: id,
        result: result
      });

      if (response.data.success) {
        alert("Market resolved: " + result);
        fetchMarkets(); // Refresh the list
      } else {
        alert("Failed to resolve market: " + response.data.error);
      }
    } catch (error) {
      console.error("Error resolving market:", error);
      alert("Failed to resolve market: " + (error.response?.data?.error || error.message));
    }
  };

  const freezeMarket = async (id, freeze) => {
    try {
      console.log(`❄️ ${freeze ? 'Freezing' : 'Unfreezing'} market ${id}`);
      const response = await api.post('/api/admin/freeze-market', {
        marketId: id,
        freeze: freeze
      });

      if (response.data.success) {
        alert(`Market ${freeze ? "frozen" : "unfrozen"}`);
        fetchMarkets(); // Refresh the list
      } else {
        alert("Failed to update market: " + response.data.error);
      }
    } catch (error) {
      console.error("Error freezing market:", error);
      alert("Failed to update market state: " + (error.response?.data?.error || error.message));
    }
  };

  const removeMarket = async (id) => {
    if (!confirm("Delete market permanently?")) return;
    try {
      console.log(`🗑️ Deleting market ${id}`);
      const response = await api.delete(`/api/admin/market/${id}`);

      if (response.data.success) {
        alert("Market deleted successfully");
        fetchMarkets(); // Refresh the list
      } else {
        alert("Failed to delete market: " + response.data.error);
      }
    } catch (error) {
      console.error("Error deleting market:", error);
      alert("Failed to delete market: " + (error.response?.data?.error || error.message));
    }
  };

  // Debug information
  console.log("📱 EventManager render - Loading:", loading, "Markets count:", markets.length, "Error:", error);

  return (
    <div style={{ maxWidth: 1100, margin: "18px auto", color: "#e6eef8" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2 style={{ margin: 0 }}>Manage Markets</h2>
        <button 
          onClick={fetchMarkets}
          disabled={loading}
          style={{
            background: "#3b82f6",
            color: "white",
            padding: "6px 12px",
            borderRadius: 6,
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Debug Info */}
      <div style={{
        background: '#1e293b',
        padding: '10px',
        borderRadius: '6px',
        marginBottom: '12px',
        fontSize: '12px',
        border: '1px solid #334155'
      }}>
        <div>Status: {loading ? '🔄 Loading...' : error ? '❌ Error' : `✅ Loaded ${markets.length} markets`}</div>
        {error && <div style={{ color: '#f87171' }}>Error: {error}</div>}
        {!loading && !error && markets.length === 0 && (
          <div style={{ color: '#fbbf24' }}>⚠️ No markets found in database</div>
        )}
      </div>

      {loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#94a3b8',
          background: '#0f172a',
          borderRadius: '8px'
        }}>
          🔄 Loading markets from API...
        </div>
      )}

      {error && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#f87171',
          background: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #dc2626'
        }}>
          ❌ Failed to load markets: {error}
          <div style={{ marginTop: '8px', fontSize: '12px' }}>
            Check browser console for details
          </div>
          <button 
            onClick={fetchMarkets}
            style={{
              marginTop: '12px',
              background: '#ef4444',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && markets.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#94a3b8',
          background: '#0f172a',
          borderRadius: '8px'
        }}>
          📭 No markets available
          <div style={{ marginTop: '8px', fontSize: '14px' }}>
            Create your first market using the Event Creator above
          </div>
        </div>
      )}

      <div style={{ display: "grid", gap: 12 }}>
        {markets.map((m) => (
          <div key={m.id} style={{ padding: 12, borderRadius: 8, background: "#071827", border: "1px solid #233044" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{m.title}</div>
                <div style={{ color: "#94a3b8", fontSize: 13, marginBottom: 4 }}>
                  {m.category} • {m.status} • Created: {new Date(m.createdAt).toLocaleDateString()}
                </div>
                {m.description && (
                  <div style={{ color: "#cbd5e1", fontSize: 14, marginBottom: 8 }}>
                    {m.description}
                  </div>
                )}
              </div>
            </div>

            {/* Options Display */}
            {m.options && (
              <div style={{ marginTop: 8 }}>
                {m.options.map((o, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: "#0b1620", borderRadius: 6, marginTop: 6 }}>
                    <div>{o.name}</div>
                    <div style={{ color: "#9fb8ff" }}>{o.probability}% • {o.odds}x</div>
                  </div>
                ))}
              </div>
            )}

            {/* Uniform Action Buttons */}
            <div style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
              paddingTop: 12,
              borderTop: "1px solid #233044"
            }}>
              {/* Freeze/Unfreeze Button */}
              {m.status === "open" && (
                <button
                  onClick={() => freezeMarket(m.id, true)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 4,
                    border: "none",
                    background: "#f59e0b",
                    color: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  Freeze
                </button>
              )}
              {m.status === "frozen" && (
                <button
                  onClick={() => freezeMarket(m.id, false)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 4,
                    border: "none",
                    background: "#10b981",
                    color: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  Unfreeze
                </button>
              )}

              {/* Resolve Buttons - Uniform */}
              {m.options?.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => setResult(m.id, option.name)}
                  style={{
                    flex: 1,
                    padding: "8px 4px",
                    borderRadius: 4,
                    border: "none",
                    background: idx === 0 ? "#16a34a" : "#ef4444",
                    color: "white",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "500"
                  }}
                >
                  Resolve {option.name}
                </button>
              ))}

              {/* Delete Button */}
              <button
                onClick={() => removeMarket(m.id)}
                style={{
                  flex: 1,
                  padding: "8px 4px",
                  borderRadius: 4,
                  border: "none",
                  background: "#6b7280",
                  color: "white",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "500"
                }}
              >
                Delete
              </button>
            </div>

            {/* Market metadata */}
            <div style={{ marginTop: 8, fontSize: "12px", color: "#64748b" }}>
              Market ID: {m.id}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
