import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaSearch, FaWallet, FaChartLine, FaHistory, FaCog, FaCamera } from 'react-icons/fa';
import { FourSquare } from 'react-loading-indicators';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('positions');
  const [timeFilter, setTimeFilter] = useState('1D');
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [userData, setUserData] = useState({
    username: '',
    balance: 0,
    totalWagered: 0,
    totalWon: 0,
    profitLoss: 0,
    profilePic: ''
  });

  useEffect(() => {
    if (!user) return;
    const userRef = ref(db, `users/${user.uid}`);
    const unsub = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setUserData({
          username: data.username || 'New User',
          balance: data.balance || 0,
          totalWagered: data.totalWagered || 0,
          totalWon: data.totalWon || 0,
          profitLoss: (data.totalWon || 0) - (data.totalWagered || 0),
          profilePic: data.profilePic || ''
        });
      }
      setLoading(false);
    });

    return () => off(userRef);
  }, [user]);

  const handleProfilePicChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await update(ref(db, `users/${user.uid}`), { profilePic: reader.result });
      setUserData((prev) => ({ ...prev, profilePic: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleUsernameSave = async () => {
    if (userData.username.trim().length < 3) return alert('Username too short');
    await update(ref(db, `users/${user.uid}`), { username: userData.username });
    setShowSettings(false);
  };

  const getProfitLossColor = (v) => (v >= 0 ? '#22c55e' : '#ef4444');
  const getOutcomeColor = (o) =>
    o === 'won' ? '#22c55e' : o === 'lost' ? '#ef4444' : o === 'pending' ? '#f59e0b' : '#94a3b8';

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
        Loading ProfilePage...
      </div>
    </div>
  );
}


  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', color: '#f1f5f9' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: '#1e293b',
          padding: '20px 16px',
          borderBottom: '1px solid #334155'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#334155',
              overflow: 'hidden',
              position: 'relative',
              marginRight: 16
            }}
          >
            {userData.profilePic ? (
              <img
                src={userData.profilePic}
                alt="profile"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <FaCamera size={28} style={{ color: '#94a3b8', margin: 16 }} />
            )}
            <label
              htmlFor="profilePicUpload"
              style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: '#3b82f6',
                borderRadius: '50%',
                padding: '4px',
                cursor: 'pointer'
              }}
            >
              <FaCamera size={12} color="#fff" />
              <input
                id="profilePicUpload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleProfilePicChange}
              />
            </label>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 'bold', fontSize: 18 }}>{userData.username}</div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>{user.email}</div>
          </div>

          <button
            onClick={() => setShowSettings(true)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer'
            }}
          >
            <FaCog size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, color: '#94a3b8' }}>Balance</div>
            <div style={{ fontSize: 24, fontWeight: 'bold' }}>
              KSH {userData.balance.toLocaleString()}
            </div>
          </div>
          <button
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: 14
            }}
          >
            Deposit
          </button>
        </div>

        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12
            }}
          >
            <div style={{ fontSize: 14, color: '#94a3b8' }}>Profit/Loss</div>
            <div
              style={{
                display: 'flex',
                gap: 8,
                backgroundColor: '#0f172a',
                padding: 4,
                borderRadius: 6
              }}
            >
              {['1D', '1W', '1M', 'ALL'].map((period) => (
                <button
                  key={period}
                  onClick={() => setTimeFilter(period)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 4,
                    border: 'none',
                    backgroundColor: timeFilter === period ? '#3b82f6' : 'transparent',
                    color: timeFilter === period ? 'white' : '#94a3b8',
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          <div
            style={{
              color: getProfitLossColor(userData.profitLoss),
              fontSize: 18,
              fontWeight: 'bold'
            }}
          >
            {userData.profitLoss >= 0 ? '+' : ''}KSH{' '}
            {Math.abs(userData.profitLoss).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a'
        }}
      >
        {[
          { id: 'positions', label: 'Positions', icon: <FaWallet size={14} /> },
          { id: 'orders', label: 'Open Orders', icon: <FaHistory size={14} /> },
          { id: 'history', label: 'History', icon: <FaChartLine size={14} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              padding: 16,
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
              borderBottom:
                activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: 16, color: '#94a3b8', textAlign: 'center' }}>
        {activeTab === 'positions' && <div>No active positions</div>}
        {activeTab === 'orders' && <div>No open orders</div>}
        {activeTab === 'history' && <div>No history yet</div>}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 50
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              padding: 20,
              borderRadius: 12,
              width: 300,
              textAlign: 'center'
            }}
          >
            <h3 style={{ marginBottom: 16 }}>Settings</h3>
            <input
              type="text"
              value={userData.username}
              onChange={(e) => setUserData({ ...userData, username: e.target.value })}
              placeholder="Username"
              style={{
                width: '100%',
                padding: 10,
                marginBottom: 12,
                backgroundColor: '#0f172a',
                border: '1px solid #334155',
                color: '#f1f5f9',
                borderRadius: 8
              }}
            />
            <button
              onClick={handleUsernameSave}
              style={{
                width: '100%',
                padding: 10,
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                marginBottom: 10,
                cursor: 'pointer'
              }}
            >
              Save Changes
            </button>
            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: 10,
                backgroundColor: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer'
              }}
            >
              Logout
            </button>
            <button
              onClick={() => setShowSettings(false)}
              style={{
                marginTop: 10,
                background: 'transparent',
                color: '#94a3b8',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
