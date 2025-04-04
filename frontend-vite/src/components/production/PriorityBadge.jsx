import React from 'react';

const PriorityBadge = ({ priority }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'LOW':
        return 'bg-gray-100 text-gray-800';
      case 'NORMAL':
        return 'bg-blue-100 text-blue-800';
      case 'HIGH':
        return 'bg-orange-100 text-orange-800';
      case 'CRITICAL':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(priority)}`}>
      {priority}
    </span>
  );
};

export default PriorityBadge;