import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api.js';

const Dashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    balance: user?.balance || 0,
    totalWagered: 0,
    totalWinnings: 0,
    recentActivity: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch user balance from Firebase when user changes
  useEffect(() => {
    if (user?.id) {
      fetchUserBalance();
    }
  }, [user]);

  const fetchUserBalance = async () => {
    try {
      setLoading(true);
      // Use the Firebase endpoint to get real-time balance
      const response = await api.get(`/api/user/${user.id}/balance`);
      
      if (response.data) {
        setDashboardData(prev => ({
          ...prev,
          balance: response.data.balance || 0
        }));
      }
    } catch (error) {
      console.error('Error fetching balance:', error);
      // If Firebase fails, use the balance from auth context
      setDashboardData(prev => ({
        ...prev,
        balance: user?.balance || 0
      }));
    } finally {
      setLoading(false);
    }
  };

  // Format currency for display
  const formatCurrency = (amount) => {
    return `KSH ${(amount || 0).toLocaleString()}`;
  };

  // Refresh dashboard data
  const refreshDashboard = () => {
    if (user?.id) {
      fetchUserBalance();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <button
          onClick={refreshDashboard}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Balance */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
          <h2 className="text-xl font-semibold mb-2">Current Balance</h2>
          <p className="text-3xl font-bold text-green-600">
            {formatCurrency(dashboardData.balance)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {loading ? 'Updating...' : 'Available for betting'}
          </p>
        </div>

        {/* Total Wagered */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
          <h2 className="text-xl font-semibold mb-2">Total Wagered</h2>
          <p className="text-3xl font-bold text-blue-600">
            {formatCurrency(dashboardData.totalWagered)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            All-time betting volume
          </p>
        </div>

        {/* Total Winnings */}
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
          <h2 className="text-xl font-semibold mb-2">Total Winnings</h2>
          <p className="text-3xl font-bold text-purple-600">
            {formatCurrency(dashboardData.totalWinnings)}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Net winnings from bets
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          <span className="text-sm text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>

        {dashboardData.recentActivity.length > 0 ? (
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <p className="font-medium">{activity.description}</p>
                  <p className="text-sm text-gray-500">{activity.date}</p>
                </div>
                <span className={`font-semibold ${
                  activity.type === 'win' ? 'text-green-600' : 
                  activity.type === 'bet' ? 'text-blue-600' : 'text-gray-600'
                }`}>
                  {activity.amount > 0 ? '+' : ''}{formatCurrency(activity.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 text-6xl mb-4">🎯</div>
            <p className="text-gray-500 text-lg mb-2">No recent activity</p>
            <p className="text-gray-400">
              Start placing bets to see your activity history here!
            </p>
            {!user && (
              <p className="text-blue-600 mt-4">
                Please log in to start betting
              </p>
            )}
          </div>
        )}
      </div>

      {/* User Info Debug - Remove in production */}
      {user && (
        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
          <h3 className="font-semibold mb-2">User Info (Debug):</h3>
          <pre className="text-sm text-gray-600">
            {JSON.stringify({
              id: user.id,
              name: user.name,
              email: user.email,
              phone: user.phone,
              balance: user.balance,
              role: user.role
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
