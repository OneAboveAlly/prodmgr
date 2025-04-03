import React from 'react';

const Button = ({ children, onClick, type = 'button', className = '' }) => (
  <button
    type={type}
    onClick={onClick}
    className={`px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 ${className}`}
  >
    {children}
  </button>
);

export default Button;
