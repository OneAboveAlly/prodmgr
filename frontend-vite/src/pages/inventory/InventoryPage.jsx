// ✅ InventoryPage.jsx z kontrolą uprawnień
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import inventoryApi from '../../api/inventory.api';
import CreateItemModal from '../../components/inventory/CreateItemModal';
import UpdateQuantityModal from '../../components/inventory/UpdateQuantityModal';
import AdjustQuantityModal from '../../components/inventory/AdjustQuantityModal';
import InventoryTableView from '../../components/inventory/InventoryTableView';
import { useAuth } from "../../contexts/AuthContext";


export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [modalMode, setModalMode] = useState('add');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustItem, setAdjustItem] = useState(null);
  const navigate = useNavigate();

  const { isReady, hasPermission } = useAuth();
  const canView = hasPermission('inventory', 'read');

  useEffect(() => {
    if (!isReady || !canView) return;
    fetchItems();
  }, [pagination.page, search, category, lowStockOnly, isReady, canView]);

  const fetchItems = async () => {
    try {
      const { items, stats, pagination: pg } = await inventoryApi.getInventoryItems({
        page: pagination.page,
        limit: pagination.limit,
        search,
        category,
        lowStock: lowStockOnly
      });
      setItems(items);
      setStats(stats);
      setPagination(prev => ({ ...prev, totalPages: pg.pages }));
    } catch (err) {
      console.error('Błąd pobierania przedmiotów:', err);
    }
  };

  const handleUpdateQuantity = (item, mode) => {
    // Przekazujemy item i tryb do modalu bez sprawdzania uprawnień
    // Uprawnienia są już sprawdzane w UpdateQuantityModal
    setModalItem(item);
    setModalMode(mode);
    // NIE ustawiamy isModalOpen, bo to jest zarezerwowane dla CreateItemModal
  };
  
  const handleAdjustQuantity = (item) => {
    setAdjustItem(item);
    setIsAdjustModalOpen(true);
  };

  // Kontrola dostępu - użytkownik musi mieć podstawowy dostęp do magazynu
  if (!isReady) return <div className="p-4">⏳ Sprawdzanie dostępu...</div>;
  if (!canView) return <div className="p-4 text-red-600">🚫 Brak uprawnień do przeglądu magazynu.</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">📦 Magazyn</h1>
        <div className="flex gap-2">
          {/* Przycisk Raport - tylko dla użytkowników z wyższym poziomem uprawnień do odczytu */}
          {hasPermission('inventory', 'read', 2) && (
            <button
              onClick={() => navigate('/inventory/report')}
              className="bg-gray-500 text-white px-4 py-2 rounded shadow hover:bg-gray-600"
            >
              📊 Raport
            </button>
          )}
          
          {/* Przycisk Historia transakcji - tylko dla użytkowników zarządzających magazynem */}
          {hasPermission('inventory', 'manage', 1) && (
            <button
              onClick={() => navigate('/inventory/transactions')}
              className="bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600"
            >
              🧾 Historia transakcji
            </button>
          )}
          
          {/* Przycisk Dodaj przedmiot - tylko dla użytkowników z uprawnieniami do tworzenia */}
          {hasPermission('inventory', 'create') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
            >
              ➕ Dodaj przedmiot
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Szukaj..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-2 py-1 rounded w-1/3 min-w-[200px]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border px-2 py-1 rounded"
        >
          <option value="">Wszystkie kategorie</option>
          {stats?.categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
          />
          Tylko niski stan
        </label>
      </div>

      {stats && (
        <div className="mb-4 text-sm text-gray-600">
          <p>🔢 Przedmiotów: <strong>{stats.totalItems}</strong></p>
          <p>⚠️ Niskie stany: <strong>{stats.lowStockItems}</strong></p>
        </div>
      )}

      <div className="border rounded">
        <InventoryTableView 
          items={items} 
          onUpdateQuantity={handleUpdateQuantity}
          onAdjustQuantity={handleAdjustQuantity}
          showActions={true}
        />
      </div>

      <div className="flex items-center gap-2 mt-4">
        <button
          onClick={() => setPagination(p => ({ ...p, page: Math.max(p.page - 1, 1) }))}
          disabled={pagination.page <= 1}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >◀️ Poprzednia</button>
        <span>Strona {pagination.page} / {pagination.totalPages || '?'}</span>
        <button
          onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
          disabled={pagination.page >= (pagination.totalPages || 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >Następna ▶️</button>
      </div>

      {isModalOpen && (
        <CreateItemModal
          onClose={() => {
            setIsModalOpen(false);
            fetchItems();
          }}
        />
      )}

      {modalItem && modalMode === 'add' && (
        <UpdateQuantityModal
          item={modalItem}
          mode="add"
          onClose={() => setModalItem(null)}
          onUpdated={fetchItems}
        />
      )}
      
      {modalItem && modalMode === 'remove' && (
        <UpdateQuantityModal
          item={modalItem}
          mode="remove"
          onClose={() => setModalItem(null)}
          onUpdated={fetchItems}
        />
      )}

      {isAdjustModalOpen && (
        <AdjustQuantityModal
          item={adjustItem}
          onClose={() => setIsAdjustModalOpen(false)}
          onUpdated={fetchItems}
        />
      )}
    </div>
  );
}