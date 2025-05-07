import React, { useEffect, useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import InventoryTransactionTable from '../../components/inventory/InventoryTransactionTable';
import { saveAs } from 'file-saver';
import { useAuth } from "../../contexts/AuthContext";
import { translateTransactionType, getTransactionTypeGroups } from '../../utils/transactionUtils';

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

  // Pobieramy grupy typów transakcji
  const transactionTypeGroups = getTransactionTypeGroups();

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
      // Konstruujemy URL i pokazujemy go w konsoli
      const params = new URLSearchParams();
      if (filters.date) params.append('date', filters.date);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());
      
      const url = `/inventory/transactions/all?${params.toString()}`;
      console.log("Request URL:", url);
      
      // Log the request parameters
      console.log("Request params:", {
        date: filters.date,
        type: filters.type,
        search: filters.search,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      // Dodajemy bardziej szczegółowe logowanie dla debugowania
      console.log("Filtry przed wysłaniem:", JSON.stringify(filters, null, 2));
      
      // Upewnij się, że wszystkie potrzebne parametry są przekazane
      const apiParams = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };
      
      console.log("Pełne parametry API:", apiParams);
      
      const res = await inventoryApi.getAllInventoryTransactions(apiParams);
      
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
    // Używamy nowej funkcji pomocniczej
    const headers = ['Data', 'Typ', 'Ilość', 'Użytkownik', 'Powód', 'Przedmiot'];
    const rows = transactions.map(tx => [
      new Date(tx.createdAt).toLocaleString(),
      translateTransactionType(tx.type),
      tx.quantity,
      `${tx.user?.firstName ?? ''} ${tx.user?.lastName ?? ''}`,
      tx.reason || '-',
      tx.item?.name ?? ''
    ]);
    const csv = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `historia-transakcji-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  // Dodajemy funkcję do debugowania typów transakcji
  const getDistinctTransactionTypes = () => {
    if (!transactions || transactions.length === 0) return [];
    const types = new Set(transactions.map(tx => tx.type));
    return Array.from(types);
  };

  if (!isReady) return null;
  
  // Wymagamy wyższego poziomu uprawnień do dostępu do historii transakcji (zarządzanie)
  if (!hasPermission('inventory', 'manage', 1)) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold text-red-600 mb-2">🚫 Brak dostępu</h2>
        <p className="text-gray-700">
          Nie masz wymaganych uprawnień do przeglądania historii transakcji magazynowych.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Tylko użytkownicy z uprawnieniami do zarządzania magazynem mogą przeglądać historię transakcji.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          ⬅️ Powrót
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Rozszerzony debug panel */}
      <div className="bg-yellow-100 p-2 mb-4 text-xs border border-yellow-300 rounded">
        <strong>Debug:</strong> Auth Ready: {isReady ? 'Yes' : 'No'}, 
        Has Permission: {isReady && hasPermission('inventory', 'read') ? 'Yes' : 'No'}, 
        API Called: {debugInfo.apiCalled ? 'Yes' : 'No'}, 
        Error: {debugInfo.error || 'None'}, 
        Transactions: {transactions?.length || 0}
        <br/>
        <strong>Filtry:</strong> Typ: {filters.type || 'brak'}, Data: {filters.date || 'brak'}, Wyszukiwanie: {filters.search || 'brak'}
        <br/>
        <strong>Paginacja:</strong> Strona: {pagination.page}, Limit: {pagination.limit}, Stron: {pagination.totalPages}
        <br/>
        <strong>Typy transakcji w wynikach:</strong> {getDistinctTransactionTypes().join(', ') || 'brak wyników'}
        {transactions && transactions.length > 0 && (
          <div className="mt-1">
            <strong>Przykładowa transakcja:</strong> 
            <pre className="overflow-x-auto text-xs mt-1 p-1 bg-white rounded">
              {JSON.stringify(transactions[0], null, 2)}
            </pre>
          </div>
        )}
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

      <div className="bg-white shadow rounded-lg p-4 mb-4">
        <h3 className="font-semibold mb-3 text-gray-700">Filtry</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data transakcji</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full border px-3 py-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Typ transakcji</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
              className="w-full border px-3 py-2 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Wszystkie typy</option>
              
              {/* Dynamicznie generujemy grupy opcji na podstawie funkcji pomocniczej */}
              {Object.entries(transactionTypeGroups).map(([groupName, types]) => (
                <optgroup key={groupName} label={groupName}>
                  {types.map(type => (
                    <option key={type.type} value={type.type}>
                      {type.fullText}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Szukaj</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Szukaj wg użytkownika, przedmiotu lub powodu"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="w-full pl-10 pr-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
        
        {/* Przyciski akcji */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setFilters({ date: '', type: '', user: '', search: '' })}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 text-sm flex items-center"
          >
            🔄 Resetuj filtry
          </button>
          <button
            onClick={fetchTransactions}
            className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-700 text-white text-sm flex items-center"
          >
            🔍 Wyszukaj
          </button>
        </div>
      </div>

      {loading ? (
        <div>⏳ Wczytywanie danych...</div>
      ) : transactions && transactions.length > 0 ? (
        <>
          <div className="text-sm text-gray-500 mb-2">
            Znaleziono {transactions.length} transakcji
          </div>
          
          <div className="bg-white shadow rounded-lg p-4 mb-4">
            <h3 className="font-semibold mb-3 text-gray-700">Legenda typów transakcji</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Używamy tych samych grup typów transakcji */}
              {Object.entries(transactionTypeGroups).map(([groupName, types]) => (
                <div key={groupName}>
                  <h4 className="font-medium text-gray-700 mb-2 border-b pb-1">{groupName}</h4>
                  <ul className="space-y-2">
                    {types.map(type => (
                      <li key={type.type} className="flex items-start">
                        <span className={`font-bold ${type.color} mr-2 flex-shrink-0`}>{type.emoji} {type.type}</span>
                        <span className="text-gray-600">{type.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
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
