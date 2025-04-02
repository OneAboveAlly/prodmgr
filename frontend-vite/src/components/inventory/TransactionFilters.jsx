// 📁 src/components/inventory/TransactionFilters.jsx
import React from 'react';

export default function TransactionFilters({ filters, setFilters, users = [], categories = [] }) {
  const handleChange = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleCheckbox = (e) => {
    setFilters((prev) => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  return (
    <div className="flex gap-4 flex-wrap mb-4">
      <input
        type="text"
        name="search"
        value={filters.search || ''}
        placeholder="Szukaj..."
        onChange={handleChange}
        className="border px-2 py-1 rounded"
      />
      
      <select
        name="userId"
        value={filters.userId || ''}
        onChange={handleChange}
        className="border px-2 py-1 rounded"
      >
        <option value="">Wszyscy użytkownicy</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {user.firstName} {user.lastName}
          </option>
        ))}
      </select>
      
      <select
        name="category"
        value={filters.category || ''}
        onChange={handleChange}
        className="border px-2 py-1 rounded"
      >
        <option value="">Wszystkie kategorie</option>
        {categories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
      
      <select
        name="type"
        value={filters.type || ''}
        onChange={handleChange}
        className="border px-2 py-1 rounded"
      >
        <option value="">Wszystkie typy</option>
        <option value="ADD">➕ Dodanie</option>
        <option value="REMOVE">➖ Wydanie</option>
        <option value="RESERVE">🔒 Rezerwacja</option>
        <option value="RELEASE">🔓 Zwolnienie</option>
      </select>
      
      <input
        type="date"
        name="date"
        value={filters.date || ''}
        onChange={handleChange}
        className="border px-2 py-1 rounded"
      />
      
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          name="lowStock"
          checked={filters.lowStock || false}
          onChange={handleCheckbox}
        />
        Tylko niski stan
      </label>
    </div>
  );
}