import React from 'react';
import EventCreator from '../components/admin/EventCreator';

const Admin = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Admin Panel</h1>
      <EventCreator />
    </div>
  );
};

export default Admin;
