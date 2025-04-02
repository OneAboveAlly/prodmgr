// ✅ UpdateQuantityModal.jsx (poprawiona kontrola uprawnień)
import React, { useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function UpdateQuantityModal({ item, mode = 'add', onClose, onUpdated }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const { hasPermission } = useAuth();

  const isAdd = mode === 'add';

  const canUpdate = hasPermission('inventory', 'update');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) {
      toast.error('Podaj poprawną ilość');
      return;
    }

    if (!canUpdate) {
      toast.error('Brak uprawnień do zmiany stanu magazynowego');
      return;
    }

    try {
      const payload = { quantity, reason };
      if (isAdd) {
        await inventoryApi.addQuantity(item.id, payload);
        toast.success(`✅ Dodano ${quantity} ${item.unit} do "${item.name}"`);
      } else {
        await inventoryApi.removeQuantity(item.id, payload);
        toast.success(`📦 Pobrano ${quantity} ${item.unit} z "${item.name}"`);
      }
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd operacji');
      console.error(err);
    }
  };

  if (!canUpdate) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
          <h2 className="text-lg font-semibold text-red-600">Brak uprawnień</h2>
          <p className="text-gray-600">Nie masz dostępu do modyfikowania ilości w magazynie.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-300 rounded">Zamknij</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">
          {isAdd ? '➕ Dodaj ilość' : '➖ Pobierz ilość'} — {item.name}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="number"
            step="any"
            min="0"
            className="w-full border rounded px-3 py-2"
            placeholder={`Ilość (${item.unit})`}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />

          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            placeholder="Powód (opcjonalnie)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className={`px-4 py-2 rounded text-white ${
                isAdd ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isAdd ? 'Dodaj' : 'Pobierz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
