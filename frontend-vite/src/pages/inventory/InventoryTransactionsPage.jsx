// 📄 src/pages/inventory/InventoryTransactionsPage.jsx
import React, { useEffect, useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import TransactionFilters from '../../components/inventory/TransactionFilters';
import InventoryTransactionTable from '../../components/inventory/InventoryTransactionTable';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

export default function InventoryTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filters, setFilters] = useState({ type: '', user: '', date: '' });
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, [filters]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await inventoryApi.getAllInventoryTransactions(filters);
      setTransactions(res.transactions);
    } catch (err) {
      console.error('Błąd pobierania transakcji:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const dataToExport = selected.length 
      ? transactions.filter(tx => selected.includes(tx.id)) 
      : transactions;

    const ws = XLSX.utils.json_to_sheet(
      dataToExport.map(tx => ({
        Data: new Date(tx.createdAt).toLocaleString(),
        Typ: tx.type,
        Ilość: tx.quantity,
        Użytkownik: `${tx.user.firstName} ${tx.user.lastName}`,
        Przedmiot: tx.item?.name,
        Powód: tx.reason || '-'
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Transakcje');
    const blob = new Blob([
      XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    ]);
    saveAs(blob, 'historia-transakcji.xlsx');
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📜 Historia transakcji</h1>
        <button
          onClick={exportToExcel}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          ⬇️ Eksportuj do Excela {selected.length > 0 ? `(${selected.length})` : ''}
        </button>
      </div>

      <TransactionFilters filters={filters} setFilters={setFilters} />

      {loading ? (
        <p>⏳ Ładowanie...</p>
      ) : (
        <InventoryTransactionTable
          transactions={transactions}
          selected={selected}
          setSelected={setSelected}
        />
      )}
    </div>
  );
}