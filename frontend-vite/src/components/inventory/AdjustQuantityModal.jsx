// AdjustQuantityModal.jsx - Modal do korekty ilości przedmiotów w magazynie
import React, { useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function AdjustQuantityModal({ item, onClose, onUpdated }) {
  const [quantity, setQuantity] = useState(item?.quantity?.toString() || '');
  const [reason, setReason] = useState('');
  const { hasPermission } = useAuth();

  // Sprawdź, czy użytkownik ma uprawnienia do korekty (wymagany wyższy poziom)
  const canAdjust = hasPermission('inventory', 'manage', 2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!quantity || parseFloat(quantity) < 0) {
      toast.error('Podaj poprawną ilość (nie mniejszą niż 0)');
      return;
    }

    if (!canAdjust) {
      toast.error('Brak uprawnień do korekty stanu magazynowego');
      return;
    }

    try {
      const payload = { 
        quantity: parseFloat(quantity), 
        reason: reason || 'Korekta ilości' 
      };
      
      await inventoryApi.adjustQuantity(item.id, payload);
      toast.success(`🔄 Skorygowano ilość "${item.name}" na ${quantity} ${item.unit}`);
      
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Błąd podczas korekty ilości');
      console.error(err);
    }
  };

  // Oblicz różnicę między aktualną a nową ilością
  const currentQuantity = parseFloat(item?.quantity || 0);
  const newQuantity = parseFloat(quantity) || 0;
  const difference = newQuantity - currentQuantity;
  const isDifferent = newQuantity !== currentQuantity;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">🔄 Korekta ilości przedmiotu</h2>
        <p className="mb-2 text-gray-700">
          <span className="font-medium">Przedmiot:</span> {item?.name}
        </p>
        
        <p className="mb-4 text-gray-700">
          <span className="font-medium">Aktualna ilość:</span> {item?.quantity} {item?.unit}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nowa ilość ({item?.unit})
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
              required
            />
            
            {isDifferent && (
              <p className="mt-1 text-sm">
                <span className={difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'}>
                  {difference > 0 ? '+' : ''}{difference} {item?.unit}
                </span>
                {' '} ({difference > 0 ? 'dodanie' : difference < 0 ? 'odjęcie' : 'bez zmian'})
              </p>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Powód korekty
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border px-3 py-2 rounded-md"
              rows="3"
              placeholder="Np. korekta po inwentaryzacji, błąd we wcześniejszym zapisie itp."
            />
          </div>
          
          {!canAdjust && (
            <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded">
              ⚠️ Korekta ilości wymaga uprawnień administratora (inventory.manage:2)
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded hover:bg-gray-100"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={!canAdjust || !isDifferent}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Zatwierdź korektę
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 