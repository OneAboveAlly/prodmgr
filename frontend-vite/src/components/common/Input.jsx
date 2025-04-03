import React from 'react';

const Input = ({ label, type = "text", value, onChange, ...rest }) => (
  <div>
    {label && <label className="block font-medium mb-1">{label}</label>}
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 rounded p-2"
      {...rest}
    />
  </div>
);

export default Input;
