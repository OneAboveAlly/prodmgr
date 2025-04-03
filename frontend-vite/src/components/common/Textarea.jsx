import React from 'react';

const Textarea = ({ value, onChange, placeholder = '', className = '', ...props }) => (
  <textarea
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300 ${className}`}
    {...props}
  />
);

export default Textarea;
