import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FourSquare } from 'react-loading-indicators';
import MarketCard from '../components/MarketCard';
import { FaFire, FaLandmark, FaMusic, FaFutbol } from 'react-icons/fa';

const HomePage = () => {
  const [activeCategory, setActiveCategory] = useState('trending');
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const scrollRef = useRef(null);

  const categories = [
    { id: 'trending', name: 'Trending', icon: <FaFire /> },
    { id: 'politics', name: 'Politics', icon: <FaLandmark /> },
    { id: 'entertainment', name: 'Entertainment', icon: <FaMusic /> },
    { id: 'sports', name: 'Sports', icon: <FaFutbol /> },
  ];

  useEffect(() => {
    const marketsRef = ref(db, 'markets');
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
    return () => off(marketsRef, 'value', unsubscribe);
  }, []);

  const getFilteredMarkets = () => {
    if (activeCategory === 'trending') {
      return markets.filter(market => market.status === 'open').slice(0, 10);
    }
    return markets.filter(
      market => market.category === activeCategory && market.status === 'open'
    );
  };

  const filteredMarkets = getFilteredMarkets();

  const handleShowBetSlip = () => {
    console.log('Showing bet slip for user:', user?.name);
  };

  if (loading) {
    return (
      <div style={{
        paddingTop: '0px',
        paddingBottom: '60px',
        width: '100%',
        backgroundColor: '#0f172a',
        minHeight: '95vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px'
      }}>
        <FourSquare color="#3b82f6" size="medium" />
        <div style={{ color: '#94a3b8', fontSize: '16px', fontWeight: '500' }}>
          Loading TrendBet Markets...
        </div>
      </div>
    );
  }

  return (
    <div style={{
      paddingTop: '0px',
      paddingBottom: '60px',
      width: '100%',
      backgroundColor: '#0f172a',
      minHeight: '100vh'
    }}>
      {/* Category Scroll Bar */}
      <div
        ref={scrollRef}
        style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 16px',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          borderBottom: '1px solid #334155',
          backgroundColor: '#0f172a',
          boxShadow: 'inset 0 -2px 4px rgba(0,0,0,0.3)',
          scrollbarWidth: 'none',
        }}
        onWheel={(e) => {
          if (scrollRef.current) {
            scrollRef.current.scrollLeft += e.deltaY * 0.5;
          }
        }}
      >
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setActiveCategory(category.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: '500',
              whiteSpace: 'nowrap',
              border: 'none',
              cursor: 'pointer',
              backgroundColor:
                activeCategory === category.id ? '#3b82f6' : '#1e293b',
              color: activeCategory === category.id ? 'white' : '#94a3b8',
              transition: 'all 0.3s ease',
              flexShrink: 0,
            }}
          >
            {category.icon}
            {category.name}
          </button>
        ))}
      </div>

      {/* Market Cards */}
      <div style={{ padding: '20px', display: 'grid', gap: '16px' }}>
        {filteredMarkets.map(market => (
          <MarketCard
            key={market.id}
            market={market}
            onShowBetSlip={handleShowBetSlip}
          />
        ))}
        {filteredMarkets.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#94a3b8'
          }}>
            No markets available in this category
          </div>
        )}
      </div>
    </div>
  );
};

export default HomePage;
