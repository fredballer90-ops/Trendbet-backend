import React from 'react';

const PasswordStrength = ({ password }) => {
  const checks = [
    {
      label: 'At least 8 characters',
      met: password.length >= 8
    },
    {
      label: 'Contains uppercase letter',
      met: /[A-Z]/.test(password)
    },
    {
      label: 'Contains lowercase letter', 
      met: /[a-z]/.test(password)
    },
    {
      label: 'Contains number',
      met: /\d/.test(password)
    },
    {
      label: 'Contains special character',
      met: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }
  ];

  const strength = checks.filter(check => check.met).length;
  let strengthText = '';
  let strengthColor = '';

  if (strength === 0) {
    strengthText = 'Very Weak';
    strengthColor = '#ef4444';
  } else if (strength <= 2) {
    strengthText = 'Weak';
    strengthColor = '#f97316';
  } else if (strength <= 3) {
    strengthText = 'Fair';
    strengthColor = '#eab308';
  } else if (strength === 4) {
    strengthText = 'Good';
    strengthColor = '#84cc16';
  } else {
    strengthText = 'Strong';
    strengthColor = '#22c55e';
  }

  return (
    <div style={{ 
      marginTop: '8px',
      padding: '12px',
      backgroundColor: '#0f172a',
      borderRadius: '8px',
      border: '1px solid #334155'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '14px', color: '#94a3b8' }}>Password Strength:</span>
        <span style={{ 
          fontSize: '14px', 
          fontWeight: '600',
          color: strengthColor
        }}>
          {strengthText}
        </span>
      </div>
      
      {/* Strength bar */}
      <div style={{
        height: '4px',
        backgroundColor: '#334155',
        borderRadius: '2px',
        marginBottom: '12px',
        overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${(strength / 5) * 100}%`,
          backgroundColor: strengthColor,
          transition: 'all 0.3s ease'
        }} />
      </div>

      {/* Requirements list */}
      <div style={{ fontSize: '12px', color: '#94a3b8' }}>
        {checks.map((check, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '4px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              backgroundColor: check.met ? '#22c55e' : '#64748b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '8px',
              fontSize: '10px',
              color: 'white'
            }}>
              {check.met ? '✓' : ''}
            </div>
            <span style={{ 
              color: check.met ? '#22c55e' : '#64748b',
              textDecoration: check.met ? 'none' : 'line-through'
            }}>
              {check.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PasswordStrength;
