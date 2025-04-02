import React, { useEffect, useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import InventoryTransactionTable from '../../components/inventory/InventoryTransactionTable';
import { saveAs } from 'file-saver';
import { useAuth } from "../../contexts/AuthContext";

export default function TransactionHistoryPage() {
  console.log("Component rendered"); // Add this early debug log
  const { hasPermission, isReady } = useAuth();
  console.log("Auth state:", { isReady, hasInventoryReadPermission: isReady ? hasPermission('inventory', 'read') : 'not ready' });

  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({
    date: '',
    type: '',
    user: '',
    search: '',
  });

  const [pagination, setPagination] = useState({ page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ apiCalled: false, error: null });

  useEffect(() => {
    console.log("Effect triggered. Ready:", isReady, "Has permission:", hasPermission('inventory', 'read'));
    if (isReady && hasPermission('inventory', 'read')) {
      fetchTransactions();
    }
  }, [isReady, hasPermission, filters, pagination.page]);

  const fetchTransactions = async () => {
    console.log("Fetching transactions...");
    setDebugInfo(prev => ({ ...prev, apiCalled: true }));
    setLoading(true);
    try {
      // Log the request parameters
      console.log("Request params:", {
        date: filters.date,
        type: filters.type,
        search: filters.search, // Make sure this is correctly used in backend
        page: pagination.page,
        limit: pagination.limit,
      });
      
      const res = await inventoryApi.getAllInventoryTransactions({
        date: filters.date,
        type: filters.type,
        search: filters.search, // Make sure this is correctly used in backend
        page: pagination.page,
        limit: pagination.limit,
      });
      
      console.log("API Response:", res); // Debug: Log full response
      
      // Safety check for response structure
      if (!res) {
        console.error("API returned empty response");
        setDebugInfo(prev => ({ ...prev, error: "Empty API response" }));
        setTransactions([]);
        return;
      }
      
      console.log("Transactions array:", res.transactions); // Debug: Log transactions array
      console.log("Transactions length:", res.transactions?.length); // Debug: Check length

      // Ensure transactions is always an array
      const transactionsArray = Array.isArray(res.transactions) ? res.transactions : [];
      console.log("Setting transactions array:", transactionsArray);
      setTransactions(transactionsArray);
      
      setPagination(p => ({ ...p, totalPages: res.pagination?.pages || 1 }));
    } catch (err) {
      console.error('Błąd pobierania historii transakcji:', err);
      setDebugInfo(prev => ({ ...prev, error: err.message }));
      setTransactions([]); // Ensure we set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Typ', 'Ilość', 'Użytkownik', 'Powód', 'Przedmiot'];
    const rows = transactions.map(tx => [
      new Date(tx.createdAt).toLocaleString(),
      tx.type,
      tx.quantity,
      `${tx.user?.firstName ?? ''} ${tx.user?.lastName ?? ''}`,
      tx.reason || '-',
      tx.item?.name ?? ''
    ]);
    const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `historia-transakcji-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (!isReady) return null;
  if (!hasPermission('inventory', 'read')) {
    return <div className="p-4 text-red-600 font-semibold">🚫 Nie masz dostępu do historii transakcji.</div>;
  }

  return (
    <div className="p-4">
      {/* Add visible debug info at the top */}
      <div className="bg-yellow-100 p-2 mb-4 text-xs border border-yellow-300 rounded">
        <strong>Debug:</strong> Auth Ready: {isReady ? 'Yes' : 'No'}, 
        Has Permission: {isReady && hasPermission('inventory', 'read') ? 'Yes' : 'No'}, 
        API Called: {debugInfo.apiCalled ? 'Yes' : 'No'}, 
        Error: {debugInfo.error || 'None'}, 
        Transactions: {transactions?.length || 0}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🧾 Historia transakcji magazynowych</h1>
        <button
          onClick={exportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
        >
          📤 Eksportuj CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="date"
          value={filters.date}
          onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
          className="border px-2 py-1 rounded"
        />
        <select
          value={filters.type}
          onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
          className="border px-2 py-1 rounded"
        >
          <option value="">Wszystkie typy</option>
          <option value="ADD">➕ Dodanie</option>
          <option value="REMOVE">➖ Pobranie</option>
          <option value="RESERVE">🔒 Rezerwacja</option>
          <option value="RELEASE">🔓 Zwolnienie</option>
        </select>
        <input
          type="text"
          placeholder="Użytkownik lub przedmiot"
          value={filters.search}
          onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
          className="border px-2 py-1 rounded"
        />
      </div>

      {loading ? (
        <div>⏳ Wczytywanie danych...</div>
      ) : transactions && transactions.length > 0 ? (
        <>
          <div className="text-sm text-gray-500 mb-2">
            Znaleziono {transactions.length} transakcji
          </div>
          <InventoryTransactionTable transactions={transactions} />
        </>
      ) : (
        <div className="p-4 bg-gray-50 rounded shadow text-center">
          <div>Brak transakcji do wyświetlenia. Użyj innych filtrów lub dodaj transakcje do systemu.</div>
          <div className="text-sm text-gray-500 mt-2">
            Debug info: transactions={JSON.stringify({length: transactions?.length})}
          </div>
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button
          disabled={pagination.page <= 1}
          onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          ◀️ Poprzednia
        </button>
        <span>Strona {pagination.page} / {pagination.totalPages}</span>
        <button
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Następna ▶️
        </button>
      </div>
    </div>
  );
}
