import React from 'react';

const Spinner = ({ label = 'Ładowanie...' }) => (
  <div className="flex items-center space-x-2">
    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    <span>{label}</span>
  </div>
);

export default Spinner;
