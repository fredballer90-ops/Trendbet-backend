import React from 'react'
import { useAuth } from '../context/AuthContext'

const Header = () => {
  const { user } = useAuth()

  return (
    <header style={{
      backgroundColor: '#0a0f1c',
      padding: '16px 20px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottom: '1px solid #334155',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '20px', fontWeight: 'bold' }}>
        <div>🎯</div>
        <span>TrendBet</span>
      </div>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ 
            backgroundColor: '#1e293b', 
            padding: '8px 12px', 
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            KSH {user.balance?.toLocaleString()}
          </div>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#3b82f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '16px'
          }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  )
}

export default Header
