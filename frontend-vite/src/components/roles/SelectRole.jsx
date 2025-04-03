import React, { useEffect, useState } from 'react';
import roleApi from '../../api/role.api';

const SelectRole = ({ label, value, onChange, includeEmpty = false }) => {
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const res = await roleApi.getAll();
        setRoles(res.data || []);
      } catch (error) {
        console.error('Błąd ładowania ról:', error);
      }
    };

    fetchRoles();
  }, []);

  return (
    <div>
      {label && <label className="block font-medium mb-1">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded p-2"
      >
        {includeEmpty && <option value="">-- Wybierz rolę --</option>}
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default SelectRole;
