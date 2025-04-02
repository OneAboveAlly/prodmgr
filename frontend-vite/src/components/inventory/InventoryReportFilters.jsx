// 🔍 src/components/inventory/InventoryReportFilters.jsx
import React from 'react';

export default function InventoryReportFilters({ filters, setFilters, categories }) {
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
        name="category"
        value={filters.category || ''}
        onChange={handleChange}
        className="border px-2 py-1 rounded"
      >
        <option value="">Wszystkie kategorie</option>
        {categories.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
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
