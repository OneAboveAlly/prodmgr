import React from 'react';

const PriorityBadge = ({ priority, size = 'normal' }) => {
  // Klasy dla różnych priorytetów z efektami hover
  const getPriorityStyles = (priority) => {
    switch (priority) {
      case 'LOW':
        return {
          base: 'bg-green-50 text-green-800 border border-green-200',
          hover: 'hover:bg-green-100 hover:border-green-300 hover:shadow-sm',
          icon: '🔽',
          label: 'Niski'
        };
      case 'NORMAL':
        return {
          base: 'bg-blue-50 text-blue-800 border border-blue-200',
          hover: 'hover:bg-blue-100 hover:border-blue-300 hover:shadow-sm',
          icon: '⏺️',
          label: 'Normalny'
        };
      case 'HIGH':
        return {
          base: 'bg-orange-100 text-orange-800 border border-orange-300',
          hover: 'hover:bg-orange-200 hover:border-orange-400 hover:shadow-md hover:shadow-orange-100',
          icon: '🔼',
          label: 'Wysoki'
        };
      case 'CRITICAL':
        return {
          base: 'bg-red-100 text-red-800 border border-red-400 animate-pulse',
          hover: 'hover:bg-red-200 hover:border-red-500 hover:shadow-md hover:shadow-red-200',
          icon: '⚠️',
          label: 'Krytyczny'
        };
      default:
        return {
          base: 'bg-gray-100 text-gray-800 border border-gray-200',
          hover: 'hover:bg-gray-200 hover:border-gray-300',
          icon: '❓',
          label: priority
        };
    }
  };

  // Rozmiar odznaki
  const sizeClasses = {
    'small': 'px-1.5 py-0.5 text-xs',
    'normal': 'px-2 py-1 text-xs',
    'large': 'px-3 py-1.5 text-sm'
  }[size] || 'px-2 py-1 text-xs';

  const styles = getPriorityStyles(priority);

  // Dodatkowe style bazujące na priorytecie
  const additionalStyles = {
    'LOW': '',
    'NORMAL': '',
    'HIGH': 'font-medium',
    'CRITICAL': 'font-bold relative overflow-hidden'
  }[priority] || '';

  return (
    <span 
      className={`
        ${sizeClasses}
        ${styles.base}
        ${styles.hover} 
        ${additionalStyles}
        inline-flex items-center leading-5 font-semibold rounded-full 
        transition-all duration-200 ease-in-out
      `}
      title={`Priorytet: ${styles.label}`}
    >
      {priority === 'CRITICAL' && (
        <span className="absolute inset-0 bg-red-400 opacity-20"></span>
      )}
      <span className="mr-1">{styles.icon}</span> {styles.label}
    </span>
  );
};

export default PriorityBadge;