// src/components/inventory/InventoryReportStats.jsx
import React from 'react';

export default function InventoryReportStats({ stats }) {
  if (!stats) return null;

  return (
    <div className="mb-4 text-sm text-gray-600">
      <p>🔢 Przedmiotów: <strong>{stats.totalItems}</strong></p>
      <p>📦 Łączna ilość: <strong>{stats.totalQuantity}</strong></p>
      <p>🔒 Zarezerwowane: <strong>{stats.reservedQuantity}</strong></p>
      <p>✅ Dostępne: <strong>{stats.availableQuantity}</strong></p>
      <p>⚠️ Niskie stany: <strong>{stats.lowStockItems}</strong></p>
    </div>
  );
}
