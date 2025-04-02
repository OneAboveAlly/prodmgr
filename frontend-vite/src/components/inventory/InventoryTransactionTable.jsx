import React from 'react';

export default function InventoryTransactionTable({
  transactions = [],
  selected = [],
  setSelected = () => {},
}) {
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
          <div className="text-sm text-gray-600 mb-2">
            Zaznaczono {selected.length} z {transactions.length} transakcji
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
                  <th className="p-2 text-left">Ilość</th>
                  <th className="p-2 text-left">Użytkownik</th>
                  <th className="p-2 text-left">Powód</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-t">
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
                    <td
                      className={`p-2 font-bold ${
                        tx.type === 'ADD'
                          ? 'text-green-600'
                          : tx.type === 'REMOVE'
                          ? 'text-red-600'
                          : 'text-blue-600'
                      }`}
                    >
                      {tx.type}
                    </td>
                    <td className="p-2">{tx.quantity}</td>
                    <td className="p-2">
                      {tx.user?.firstName} {tx.user?.lastName}
                    </td>
                    <td className="p-2">{tx.reason || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
