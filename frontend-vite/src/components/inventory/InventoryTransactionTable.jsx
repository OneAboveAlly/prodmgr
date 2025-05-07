import React, { useState } from 'react';
import { getTransactionTypeInfo } from '../../utils/transactionUtils';

export default function InventoryTransactionTable({
  transactions = [],
  selected = [],
  setSelected = () => {},
}) {
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  
  const toggleSelection = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((sid) => sid !== id));
    } else {
      setSelected([...selected, id]);
    }
  };

  const allSelected = transactions.length > 0 && selected.length === transactions.length;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(transactions.map((tx) => tx.id));
    }
  };

  return (
    <div className="mt-4">
      {transactions.length === 0 ? (
        <p className="text-gray-500">Brak transakcji do wyświetlenia.</p>
      ) : (
        <>
          {/* ✅ LICZNIK zaznaczonych */}
          <div className="text-sm text-gray-600 mb-2 flex justify-between">
            <span>Zaznaczono {selected.length} z {transactions.length} transakcji</span>
            <button 
              onClick={() => setShowDebugInfo(!showDebugInfo)} 
              className="text-xs text-blue-600 hover:underline"
            >
              {showDebugInfo ? "Ukryj szczegóły debugowania" : "Pokaż szczegóły debugowania"}
            </button>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-2 text-left">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th className="p-2 text-left">Data</th>
                  <th className="p-2 text-left">Typ</th>
                  {showDebugInfo && <th className="p-2 text-left bg-yellow-50">Oryginalny typ</th>}
                  <th className="p-2 text-left">Przedmiot</th>
                  <th className="p-2 text-left">Ilość</th>
                  <th className="p-2 text-left">Użytkownik</th>
                  <th className="p-2 text-left">Powód</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => {
                  const typeInfo = getTransactionTypeInfo(tx.type);
                  const quantity = parseFloat(tx.quantity);
                  const formattedQuantity = Math.abs(quantity) + (tx.item?.unit ? ` ${tx.item.unit}` : '');
                  
                  return (
                  <tr key={tx.id} className="border-t hover:bg-gray-50">
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={selected.includes(tx.id)}
                        onChange={() => toggleSelection(tx.id)}
                      />
                    </td>
                    <td className="p-2">
                      {new Date(tx.createdAt).toLocaleString()}
                    </td>
                    <td className={`p-2 font-bold ${typeInfo.color}`}>
                      {typeInfo.fullText}
                    </td>
                    {showDebugInfo && <td className="p-2 bg-yellow-50 font-mono text-xs">{tx.type}</td>}
                    <td className="p-2 font-medium">
                      {tx.item?.name || '-'}
                    </td>
                    <td className="p-2">
                      {formattedQuantity}
                    </td>
                    <td className="p-2">
                      {tx.user?.firstName} {tx.user?.lastName}
                    </td>
                    <td className="p-2">{tx.reason || '-'}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
