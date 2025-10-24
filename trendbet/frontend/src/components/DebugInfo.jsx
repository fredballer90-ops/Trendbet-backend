import React, { useState, useEffect } from 'react';
import api, { testConnection } from '../utils/api.js';

const DebugInfo = () => {
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState(null);
  const [error, setError] = useState(null);
  const [connectionTest, setConnectionTest] = useState(null);

  const testBackendConnection = async () => {
    try {
      setError(null);
      const result = await testConnection();
      setConnectionTest(result);
      // After successful connection test, get health
      const healthResponse = await api.get('/health');
      setHealth(healthResponse.data);
    } catch (err) {
      setError(err.message);
      console.error('Connection test failed:', err);
    }
  };

  const checkHealth = async () => {
    try {
      setError(null);
      const response = await api.get('/health');
      setHealth(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Health check failed:', err);
    }
  };

  const checkUsers = async () => {
    try {
      setError(null);
      const response = await api.get('/debug/users');
      setUsers(response.data);
    } catch (err) {
      setError(err.message);
      console.error('Users debug failed:', err);
    }
  };

  useEffect(() => {
    testBackendConnection();
  }, []);

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#1e293b',
      borderRadius: '8px',
      margin: '10px',
      border: '1px solid #334155'
    }}>
      <h3 style={{ color: 'white', marginBottom: '16px' }}>🔧 Debug Information</h3>
      
      <div style={{ marginBottom: '16px' }}>
        <button 
          onClick={testBackendConnection}
          style={{
            padding: '8px 16px',
            marginRight: '8px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Test Connection
        </button>
        
        <button 
          onClick={checkHealth}
          style={{
            padding: '8px 16px',
            marginRight: '8px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Health
        </button>
        
        <button 
          onClick={checkUsers}
          style={{
            padding: '8px 16px',
            backgroundColor: '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Users
        </button>
      </div>

      {connectionTest && (
        <div style={{
          padding: '12px',
          backgroundColor: connectionTest.success ? '#10b981' : '#ef4444',
          color: 'white',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          {connectionTest.success ? '✅ ' : '❌ '}
          {connectionTest.success 
            ? `Connected to: ${connectionTest.url}`
            : 'Failed to connect to backend'
          }
        </div>
      )}

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#ef4444',
          color: 'white',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          ❌ Error: {error}
        </div>
      )}

      {health && (
        <div style={{
          padding: '12px',
          backgroundColor: '#0f172a',
          borderRadius: '4px',
          marginBottom: '16px'
        }}>
          <h4 style={{ color: '#10b981', marginBottom: '8px' }}>✅ API Health</h4>
          <pre style={{ color: 'white', fontSize: '12px' }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}

      {users && (
        <div style={{
          padding: '12px',
          backgroundColor: '#0f172a',
          borderRadius: '4px'
        }}>
          <h4 style={{ color: '#10b981', marginBottom: '8px' }}>👥 Users in Database</h4>
          <pre style={{ color: 'white', fontSize: '12px' }}>
            {JSON.stringify(users, null, 2)}
          </pre>
        </div>
      )}

      <div style={{
        padding: '12px',
        backgroundColor: '#0f172a',
        borderRadius: '4px',
        marginTop: '16px'
      }}>
        <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>🌐 Network Information</h4>
        <div style={{ color: 'white', fontSize: '12px' }}>
          <div>Frontend URL: {window.location.origin}</div>
          <div>Backend Port: 5001</div>
          <div>Trying URLs: localhost, 127.0.0.1, 192.168.2.100</div>
        </div>
      </div>
    </div>
  );
};

export default DebugInfo;
