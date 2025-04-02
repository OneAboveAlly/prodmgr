// ✅ InventoryReportTable.jsx z checkboxami i licznikiem zaznaczonych
import React from "react";
import { useAuth } from "../../contexts/AuthContext";

export default function InventoryReportTable({ items, selected = [], setSelected = () => {} }) {
  const { hasPermission } = useAuth();
  const canSeePrice = hasPermission("inventory", "read", 2);

  const toggleSelection = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((sid) => sid !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const allSelected = items.length > 0 && selected.length === items.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(items.map((item) => item.id));
    }
  };

  return (
    <div className="overflow-auto border rounded">
      <div className="text-sm text-gray-600 mb-2">
        Zaznaczono {selected.length} z {items.length} pozycji
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="text-left p-2">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            </th>
            <th className="text-left p-2">Nazwa</th>
            <th className="text-left p-2">Kod</th>
            <th className="text-left p-2">Kategoria</th>
            <th className="text-left p-2">Lokalizacja</th>
            <th className="text-left p-2">Jednostka</th>
            <th className="text-left p-2">Stan</th>
            <th className="text-left p-2">Zarezerwowane</th>
            <th className="text-left p-2">Dostępne</th>
            <th className="text-left p-2">Min. ilość</th>
            <th className="text-left p-2">Status</th>
            {canSeePrice && <th className="text-left p-2">Cena</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="p-2">
                <input
                  type="checkbox"
                  checked={selected.includes(item.id)}
                  onChange={() => toggleSelection(item.id)}
                />
              </td>
              <td className="p-2 font-medium">{item.name}</td>
              <td className="p-2 text-xs text-gray-500">{item.barcode}</td>
              <td className="p-2">{item.category}</td>
              <td className="p-2">{item.location}</td>
              <td className="p-2">{item.unit}</td>
              <td className="p-2">{item.quantity}</td>
              <td className="p-2">{item.reserved}</td>
              <td className="p-2">{item.available}</td>
              <td className="p-2">{item.minQuantity ?? '-'}</td>
              <td className="p-2 font-bold text-xs">
                {item.status === 'OK' && <span className="text-green-600">✅ OK</span>}
                {item.status === 'Niski stan' && <span className="text-yellow-600">⚠️ Niski</span>}
                {item.status === 'Brak dostępnych (zarezerwowane)' && <span className="text-red-600">🚫 Brak</span>}
              </td>
              {canSeePrice && (
                <td className="p-2">
                  {item.price != null ? `${item.price.toFixed(2)} zł` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
