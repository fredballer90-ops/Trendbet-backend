// frontend/src/pages/Events.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const categories = [
    { id: 'all', name: 'All Events' },
    { id: 'politics', name: 'Politics' },
    { id: 'entertainment', name: 'Entertainment' },
    { id: 'sports', name: 'Sports' },
    { id: 'business', name: 'Business' },
    { id: 'social-media', name: 'Social Media' },
    { id: 'reality-tv', name: 'Reality TV' }
  ];

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockEvents = [
      // ... (same as featured events but more)
    ];
    
    setEvents(mockEvents);
    setLoading(false);
  }, []);

  const filteredEvents = selectedCategory === 'all' 
    ? events 
    : events.filter(event => event.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">All Events</h1>
        {user?.role === 'admin' && (
          <Link 
            to="/admin" 
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
          >
            Create Event
          </Link>
        )}
      </div>

      {/* Category Filters */}
      <div className="flex space-x-4 mb-8 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-green-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <div key={event._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                    {event.category}
                  </span>
                  <span className="text-sm text-gray-500">
                    Ends: {new Date(event.endTime).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="font-semibold text-lg mb-4">{event.title}</h3>
                
                <div className="space-y-3 mb-4">
                  {event.options.map((option, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium">{option.name}</span>
                      <span className="bg-green-600 text-white px-3 py-1 rounded text-sm font-semibold">
                        {option.currentOdds}x
                      </span>
                    </div>
                  ))}
                </div>

                {user ? (
                  <button className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
                    Place Bet
                  </button>
                ) : (
                  <Link
                    to="/register"
                    className="block w-full bg-green-600 text-white text-center py-2 rounded-lg hover:bg-green-700 transition"
                  >
                    Sign Up to Bet
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No events found in this category.</p>
        </div>
      )}
    </div>
  );
};

export default Events;
