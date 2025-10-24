import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaLandmark, FaMusic, FaFutbol, FaBolt, FaChartBar, FaCoins, FaSpinner } from 'react-icons/fa';
import api from '../utils/api.js';

const MarketCard = ({ market }) => {
  const { user } = useAuth();
  const [selectedOutcome, setSelectedOutcome] = useState(null);
  const [betAmount, setBetAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [showBetInterface, setShowBetInterface] = useState(false);

  const getCategoryIcon = (category) => {
    switch(category) {
      case 'politics': return <FaLandmark size={20} />;
      case 'entertainment': return <FaMusic size={20} />;
      case 'sports': return <FaFutbol size={20} />;
      case 'breaking': return <FaBolt size={20} />;
      case 'trending': return <FaChartBar size={20} />;
      default: return <FaChartBar size={20} />;
    }
  };                                                       
  const getCategoryColor = (category) => {
    switch(category) {
      case 'politics': return '#3b82f6';
      case 'entertainment': return '#8b5cf6';                    
      case 'sports': return '#10b981';
      case 'breaking': return '#ef4444';
      case 'trending': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const handleOutcomeSelect = (outcome) => {
    if (!user) {
      alert('Please log in to place bets');
      return;
    }
    setSelectedOutcome(outcome);
    setShowBetInterface(true);
  };

  const handlePlaceBet = async () => {
    if (!user || !selectedOutcome || !betAmount) return;

    const amount = parseFloat(betAmount);
    if (amount < 100) {
      alert('Minimum bet is KSH 100');
      return;
    }
    if (amount > 100000) {
      alert('Maximum bet is KSH 100,000');
      return;
    }

    setLoading(true);
    try {
      const betData = {
        marketId: market.id,
        event: market.title,
        selection: selectedOutcome.name,
        odds: selectedOutcome.odds,
        stake: amount,
        potentialWin: amount * selectedOutcome.odds,
        category: market.category
      };

      const response = await api.post('/api/bets/place', betData);

      if (response.data.success) {
        alert(`✅ Bet placed successfully!\nPotential payout: KSH ${(amount * selectedOutcome.odds).toLocaleString()}`);
        // Reset interface
        setSelectedOutcome(null);
        setBetAmount('');
        setShowBetInterface(false);
      } else {
        alert(`❌ Bet failed: ${response.data.message}`);
      }
    } catch (error) {
      console.error('Bet placement error:', error);
      alert(`❌ Bet placement failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBet = () => {
    setSelectedOutcome(null);
    setBetAmount('');
    setShowBetInterface(false);
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '16px',
        border: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px'
      }}>
        <FaSpinner className="spinner" size={24} style={{ color: '#3b82f6' }} />
        <div style={{ color: '#94a3b8', marginTop: '16px' }}>
          Placing your bet...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: '#1e293b',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      border: '1px solid #334155',
      transition: 'all 0.3s ease'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '8px',
          backgroundColor: getCategoryColor(market.category),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0
        }}>
          {getCategoryIcon(market.category)}
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            fontSize: '15px',
            fontWeight: '600',
            lineHeight: '1.4',
            marginBottom: '8px',
            color: '#f1f5f9'
          }}>
            {market.title}
          </h3>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#94a3b8',
            marginBottom: '4px',
            flexWrap: 'wrap'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FaCoins size={10} />
              Volume: {market.volume}
            </span>
            <span>•</span>
            <span style={{
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: getCategoryColor(market.category) + '20',
              color: getCategoryColor(market.category),
              fontSize: '11px',
              fontWeight: '500'
            }}>
              {market.category}
            </span>
          </div>

          {market.resolution && (
            <div style={{
              fontSize: '11px',
              color: '#64748b',
              fontStyle: 'italic',
              lineHeight: '1.3'
            }}>
              📋 {market.resolution}
            </div>
          )}
        </div>
      </div>

      {/* Betting Interface */}
      {showBetInterface && selectedOutcome ? (
        <div style={{
          backgroundColor: '#0f172a',
          borderRadius: '8px',
          padding: '16px',
          border: '2px solid #334155',
          marginBottom: '12px',
          animation: 'slideDown 0.3s ease'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#f1f5f9', fontWeight: '500' }}>
                Betting on: <span style={{ color: '#3b82f6' }}>{selectedOutcome.name}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                Odds: {selectedOutcome.odds}x • Probability: {selectedOutcome.probability}%
              </div>
            </div>
            <button
              onClick={handleCancelBet}
              style={{
                background: 'none',
                border: '1px solid #ef4444',
                color: '#ef4444',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              Bet Amount (KSH)
            </label>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              placeholder="Enter amount..."
              min="100"
              max="100000"
              step="100"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#1e293b',
                color: '#f1f5f9',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#334155'}
            />
            <div style={{
              fontSize: '11px',
              color: '#64748b',
              marginTop: '4px'
            }}>
              Min: KSH 100 • Max: KSH 100,000
            </div>
          </div>

          {betAmount && (
            <div style={{
              backgroundColor: '#1e293b',
              padding: '10px',
              borderRadius: '6px',
              marginBottom: '12px',
              border: '1px solid #334155'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '13px',
                color: '#94a3b8'
              }}>
                <span>Potential Payout:</span>
                <span style={{ color: '#22c55e', fontWeight: '600' }}>
                  KSH {(parseFloat(betAmount) * selectedOutcome.odds).toLocaleString()}
                </span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: '#64748b',
                marginTop: '2px'
              }}>
                <span>Stake:</span>
                <span>KSH {parseFloat(betAmount).toLocaleString()}</span>
              </div>
            </div>
          )}

          <button
            onClick={handlePlaceBet}
            disabled={!betAmount || parseFloat(betAmount) < 100 || loading}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: (!betAmount || parseFloat(betAmount) < 100 || loading) ? '#374151' : '#22c55e',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (!betAmount || parseFloat(betAmount) < 100 || loading) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              if (betAmount && parseFloat(betAmount) >= 100 && !loading) {
                e.target.style.backgroundColor = '#16a34a';
              }
            }}
            onMouseOut={(e) => {
              if (betAmount && parseFloat(betAmount) >= 100 && !loading) {
                e.target.style.backgroundColor = '#22c55e';
              }
            }}
          >
            {loading ? 'Placing Bet...' : 
             !betAmount || parseFloat(betAmount) < 100 ? 'Enter Amount' : 'Place Bet'}
          </button>
        </div>
      ) : (
        /* Betting Options */
        <div style={{ display: 'flex', gap: '8px' }}>
          {market.options.map((option, index) => (
            <button
              key={option.id}
              onClick={() => handleOutcomeSelect(option)}
              style={{
                flex: 1,
                padding: '12px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: index === 0 ? '#1e40af20' : '#dc262620',
                color: index === 0 ? '#3b82f6' : '#ef4444',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
              }}
              onMouseOver={(e) => {
                e.target.style.backgroundColor = index === 0 ? '#1e40af40' : '#dc262640';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.backgroundColor = index === 0 ? '#1e40af20' : '#dc262620';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <div>{option.name}</div>
              <div style={{
                fontSize: '12px',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span>{option.odds}x</span>
                <span style={{ opacity: 0.6 }}>•</span>
                <span>{option.probability}%</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default MarketCard;
