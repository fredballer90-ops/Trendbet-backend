import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api.js'

const BetSlip = ({ onClose }) => {
  const { user } = useAuth()
  const [bets, setBets] = useState([
    {
      id: 1,
      event: 'Kenya Presidential Election 2027',
      option: 'William Ruto',
      odds: 2.50,
      stake: 0,
      potentialWin: 0
    }
  ])
  const [totalStake, setTotalStake] = useState(0)
  const [totalPotentialWin, setTotalPotentialWin] = useState(0)
  const [loading, setLoading] = useState(false)

  const updateStake = (betId, stake) => {
    const updatedBets = bets.map(bet => {
      if (bet.id === betId) {
        const potentialWin = stake * bet.odds
        return { ...bet, stake, potentialWin }
      }
      return bet
    })

    setBets(updatedBets)

    // Calculate totals
    const newTotalStake = updatedBets.reduce((sum, bet) => sum + bet.stake, 0)
    const newTotalWin = updatedBets.reduce((sum, bet) => sum + bet.potentialWin, 0)

    setTotalStake(newTotalStake)
    setTotalPotentialWin(newTotalWin)
  }

  const placeBet = async () => {
    if (!user) {
      alert('Please login to place a bet!')
      return
    }

    if (totalStake > user.balance) {
      alert('Insufficient balance!')
      return
    }

    if (totalStake === 0) {
      alert('Please enter stake amounts!')
      return
    }

    setLoading(true)

    try {
      // Prepare bet data for backend
      const betData = {
        bets: bets.map(bet => ({
          event: bet.event,
          market: 'winner', // You might want to make this dynamic
          selection: bet.option,
          odds: bet.odds,
          stake: bet.stake,
          potentialWin: bet.potentialWin
        })),
        totalStake,
        totalPotentialWin
      }

      // Send to backend
      const response = await api.post('/api/bets/place', betData)

      if (response.data.success) {
        alert(`Bet placed successfully! Total stake: KSH ${totalStake.toLocaleString()}`)
        
        // Refresh user data to get updated balance
        // You might want to add this function to your AuthContext
        // await refreshUserData();
        
        onClose()
      } else {
        alert('Failed to place bet: ' + response.data.message)
      }
    } catch (error) {
      console.error('Error placing bet:', error)
      alert('Failed to place bet. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const removeBet = (betId) => {
    setBets(bets.filter(bet => bet.id !== betId))
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      zIndex: 2000,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        backgroundColor: '#1e293b',
        margin: '20px',
        borderRadius: '12px',
        padding: '20px',
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Betting Slip</h2>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer'
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {bets.map(bet => (
            <div key={bet.id} style={{
              backgroundColor: '#334155',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '4px' }}>
                    {bet.event}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {bet.option}
                  </div>
                </div>
                <button
                  onClick={() => removeBet(bet.id)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer'
                  }}
                >
                  🗑️
                </button>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <span style={{ fontSize: '14px' }}>Stake:</span>
                <input
                  type="number"
                  value={bet.stake || ''}
                  onChange={(e) => updateStake(bet.id, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  style={{
                    backgroundColor: '#475569',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'white',
                    width: '100px',
                    fontSize: '14px'
                  }}
                />
                <span style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Odds: {bet.odds}x
                </span>
              </div>

              {bet.stake > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '14px',
                  color: '#22c55e'
                }}>
                  Potential Win: KSH {bet.potentialWin.toLocaleString()}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{
          borderTop: '1px solid #475569',
          paddingTop: '16px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '12px',
            fontSize: '16px',
            fontWeight: '600'
          }}>
            <span>Total Stake:</span>
            <span>KSH {totalStake.toLocaleString()}</span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '20px',
            fontSize: '16px',
            fontWeight: '600',
            color: '#22c55e'
          }}>
            <span>Potential Win:</span>
            <span>KSH {totalPotentialWin.toLocaleString()}</span>
          </div>

          <button
            onClick={placeBet}
            disabled={totalStake === 0 || totalStake > (user?.balance || 0) || loading}
            style={{
              backgroundColor: totalStake === 0 || totalStake > (user?.balance || 0) || loading ? '#475569' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: totalStake === 0 || totalStake > (user?.balance || 0) || loading ? 'not-allowed' : 'pointer',
              width: '100%'
            }}
          >
            {loading ? 'Placing Bet...' : 
             totalStake > (user?.balance || 0) ? 'Insufficient Balance' : 
             'Place Bet'}
          </button>

          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            {user ? `Available: KSH ${user.balance?.toLocaleString()}` : 'Please login to place bets'}
          </div>
        </div>
      </div>
    </div>
  )
}

export default BetSlip
