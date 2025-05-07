import React from 'react';

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800';
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Tłumaczenia statusów na polski
  const getStatusTranslation = (status) => {
    switch (status) {
      case 'DRAFT':
        return 'Szkic';
      case 'IN_PROGRESS':
        return 'W trakcie';
      case 'COMPLETED':
        return 'Zakończony';
      case 'CANCELLED':
        return 'Anulowany';
      default:
        return status ? status.replace('_', ' ') : '';
    }
  };

  return (
    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(status)}`}>
      {getStatusTranslation(status)}
    </span>
  );
};

export default StatusBadge;