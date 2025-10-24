import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../utils/api.js";
import EventCreator from "../components/admin/EventCreator";
import EventManager from "../components/admin/EventManager";

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Balance management states
  const [balanceUpdate, setBalanceUpdate] = useState({ userId: '', amount: '' });
  const [allUsers, setAllUsers] = useState([]);
  const [showBalanceForm, setShowBalanceForm] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  // Function to fetch all users
  const fetchAllUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await api.get('/api/debug/users');
      setAllUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      alert('❌ Failed to load users: ' + error.message);
    } finally {
      setUsersLoading(false);
    }
  };

  // Function to update user balance
  const addUserBalance = async () => {
    if (!balanceUpdate.userId || !balanceUpdate.amount) {
      alert('Please select a user and enter amount');
      return;
    }

    if (parseFloat(balanceUpdate.amount) <= 0) {
      alert('Please enter a positive amount');
      return;
    }

    try {
      const response = await api.post('/api/admin/user-balance', {
        userId: balanceUpdate.userId,
        amount: parseFloat(balanceUpdate.amount)
      });

      alert(`✅ ${response.data.message}\nNew Balance: KSH ${response.data.newBalance.toLocaleString()}`);

      // Reset form and refresh users
      setBalanceUpdate({ userId: '', amount: '' });
      fetchAllUsers();
    } catch (error) {
      alert('❌ Failed to update balance: ' + error.message);
    }
  };

  // Quick balance top-up functions
  const quickTopUp = async (amount) => {
    if (!user?.id) {
      alert('No user ID found');
      return;
    }

    try {
      const response = await api.post('/api/admin/user-balance', {
        userId: user.id,
        amount: amount
      });

      alert(`✅ ${response.data.message}\nNew Balance: KSH ${response.data.newBalance.toLocaleString()}`);
      fetchAllUsers();
    } catch (error) {
      alert('❌ Failed to add balance: ' + error.message);
    }
  };

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        // Check if user has admin role from backend
        const isUserAdmin = user.role === 'admin' || user.role === 'superadmin';

        if (isUserAdmin) {
          setIsAdmin(true);
        } else {
          // Fallback: Check if user is in admin list (you could create this endpoint)
          try {
            const response = await api.get('/api/admin/check');
            if (response.data.isAdmin) {
              setIsAdmin(true);
            } else {
              setIsAdmin(false);
            }
          } catch (error) {
            // If no admin endpoint, use role-based check
            setIsAdmin(isUserAdmin);
          }
        }
      } catch (error) {
        console.error("Admin check error:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);


// if  Admin check passes
console.log(' ADMIN DASHBOARD DEBUG:');
console.log('User:', user);
console.log('Is Admin:', isAdmin);
console.log('All Users:', allUsers);
console.log('Show Balance Form:', showBalanceForm);

// Add a visible debug banner in the UI
// Add this to your return statement, right after the welcome message:
<div style={{
  background: '#f59e0b', 
  color: 'black', 
  padding: '10px', 
  borderRadius: '8px',
  marginBottom: '20px',
  fontWeight: 'bold'
}}>
   DEBUG: Admin Dashboard Loaded | Users: {allUsers.length} | Balance Form: {showBalanceForm ? 'OPEN' : 'CLOSED'}
</div>

  // Fetch users when admin status is confirmed
  useEffect(() => {
    if (isAdmin) {
      fetchAllUsers();
    }
  }, [isAdmin]);

  if (authLoading || loading) {
    return (
      <div className="p-4" style={{ color: "#e6eef8" }}>
        Checking admin privileges...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4" style={{ color: "#e6eef8" }}>
        Please log in to access the admin panel.
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-4" style={{ color: "#e6eef8" }}>
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-xl font-bold mb-4">Access Denied</h2>
          <p>You are not authorized to access the admin dashboard.</p>
          <p className="text-sm mt-2 text-red-300">
            Current role: {user.role || 'user'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 16px", color: "#e6eef8" }}>
      <div className="mb-6">
        <h1 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "8px" }}>
          Admin Dashboard
        </h1>
        <p className="text-gray-400">
          Welcome back, {user.name || user.email}! Manage events and markets.
        </p>
      </div>

      {/* Admin Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Market Management</h3>
          <p className="text-sm text-blue-300">Create and manage betting markets</p>
        </div>
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">User Management</h3>
          <p className="text-sm text-green-300">View and manage user accounts</p>
        </div>
        <div className="bg-purple-900 border border-purple-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">Balance Management</h3>
          <p className="text-sm text-purple-300">Add funds to user accounts</p>
        </div>
        <div className="bg-orange-900 border border-orange-700 rounded-lg p-4">
          <h3 className="font-semibold mb-2">System Overview</h3>
          <p className="text-sm text-orange-300">Monitor platform activity</p>
        </div>
      </div>

      {/* Balance Management Section */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h3 style={{ margin: 0 }}>User Balance Management</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              onClick={() => setShowBalanceForm(!showBalanceForm)}
              style={{
                background: showBalanceForm ? '#ef4444' : '#3b82f6',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              {showBalanceForm ? 'Close' : 'Manage Balances'}
            </button>
            <button
              onClick={fetchAllUsers}
              disabled={usersLoading}
              style={{
                background: '#6b7280',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                cursor: usersLoading ? 'not-allowed' : 'pointer',
                opacity: usersLoading ? 0.6 : 1
              }}
            >
              {usersLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {showBalanceForm && (
          <div style={{
            background: '#0b1220',
            padding: '20px',
            borderRadius: '10px',
            border: '1px solid #334155'
          }}>
            {/* Quick Top-up Buttons */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px' }}>Quick Top-up (Your Account)</h4>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => quickTopUp(1000)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#059669',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  +1,000 KSH
                </button>
                <button
                  onClick={() => quickTopUp(5000)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#059669',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  +5,000 KSH
                </button>
                <button
                  onClick={() => quickTopUp(10000)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#059669',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  +10,000 KSH
                </button>
                <button
                  onClick={() => quickTopUp(50000)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: 'none',
                    background: '#059669',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  +50,000 KSH
                </button>
              </div>
            </div>

            {/* Balance Update Form */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ marginBottom: '12px' }}>Add Balance to Any User</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Select User</label>
                  <select
                    value={balanceUpdate.userId}
                    onChange={(e) => setBalanceUpdate({ ...balanceUpdate, userId: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      background: '#071122',
                      color: '#e6eef8'
                    }}
                  >
                    <option value="">Select a user</option>
                    {allUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name} - {user.phone} (KSH {user.balance?.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px' }}>Amount (KSH)</label>
                  <input
                    type="number"
                    value={balanceUpdate.amount}
                    onChange={(e) => setBalanceUpdate({ ...balanceUpdate, amount: e.target.value })}
                    placeholder="Enter amount"
                    min="1"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      background: '#071122',
                      color: '#e6eef8'
                    }}
                  />
                </div>
                
                <button
                  onClick={addUserBalance}
                  disabled={!balanceUpdate.userId || !balanceUpdate.amount}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    background: !balanceUpdate.userId || !balanceUpdate.amount ? '#475569' : '#22c55e',
                    color: 'white',
                    cursor: !balanceUpdate.userId || !balanceUpdate.amount ? 'not-allowed' : 'pointer',
                    height: '40px'
                  }}
                >
                  Add Balance
                </button>
              </div>
            </div>

            {/* Users List */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ margin: 0 }}>All Users ({allUsers.length})</h4>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Total Balance: KSH {allUsers.reduce((sum, user) => sum + (user.balance || 0), 0).toLocaleString()}
                </div>
              </div>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {allUsers.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                    No users found
                  </div>
                ) : (
                  allUsers.map(user => (
                    <div key={user.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#071122',
                      borderRadius: '6px',
                      marginBottom: '8px',
                      border: '1px solid #334155'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {user.name}
                          {user.role === 'admin' && (
                            <span style={{
                              background: '#3b82f6',
                              color: 'white',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '500'
                            }}>
                              ADMIN
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                          {user.phone} • {user.email}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                          ID: {user.id}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: '600', color: '#22c55e', fontSize: '16px' }}>
                          KSH {user.balance?.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginBottom: "32px" }}>
        <EventCreator />
      </div>

      <div>
        <EventManager />
      </div>

      {/* Debug Info - Remove in production */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Admin Debug Info:</h3>
        <pre className="text-sm text-gray-400">
          {JSON.stringify({
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
              phone: user.phone,
              balance: user.balance
            },
            isAdmin: isAdmin,
            totalUsers: allUsers.length,
            timestamp: new Date().toISOString()
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}
