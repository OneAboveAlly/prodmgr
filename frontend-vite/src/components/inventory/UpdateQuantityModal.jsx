// ✅ UpdateQuantityModal.jsx (poprawiona kontrola uprawnień)
import React, { useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

export default function UpdateQuantityModal({ item, mode = 'add', onClose, onUpdated }) {
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [removeReserved, setRemoveReserved] = useState(false);
  const { hasPermission } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdd = mode === 'add';

  // Poprawione sprawdzanie uprawnień
  // Użytkownik musi mieć uprawnienia issue do pobierania lub manage do dodawania
  const canPerformAction = isAdd ? hasPermission('inventory', 'manage') : hasPermission('inventory', 'issue');
  
  // Sprawdź, czy użytkownik ma uprawnienia do pobierania zarezerwowanych
  const canRemoveReserved = hasPermission('inventory', 'manage', 2) || hasPermission('production', 'manage', 2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Sprawdzanie uprawnień zostało już wykonane na etapie renderowania komponentu
    // więc nie musimy ponownie sprawdzać tutaj
    
    setIsSubmitting(true);
    
    try {
      if (mode === 'add') {
        await inventoryApi.addQuantity(item.id, {
          quantity: Number(quantity),
          reason: reason || 'Dodanie przedmiotów'
        });
        toast.success(`✅ Dodano ${quantity} ${item.unit} przedmiotu ${item.name}`);
      } else {
        // Check if there's enough available quantity
        if (Number(quantity) > item.available) {
          toast.error(`❌ Nie można pobrać więcej niż dostępna ilość (${item.available} ${item.unit})`);
          setIsSubmitting(false);
          return;
        }
        
        // Dodaj obsługę zarezerwowanych przedmiotów, jeśli ta opcja jest zaznaczona
        const params = {
          quantity: Number(quantity),
          reason: reason || 'Pobranie przedmiotów'
        };
        
        if (removeReserved) {
          params.removeReserved = true;
        }
        
        await inventoryApi.removeQuantity(item.id, params);
        toast.success(`✅ Pobrano ${quantity} ${item.unit} przedmiotu ${item.name}`);
      }
      
      onClose();
      if (onUpdated) onUpdated();
    } catch (err) {
      console.error(`❌ Błąd ${mode === 'add' ? 'dodawania' : 'pobierania'} przedmiotu:`, err);
      toast.error(`Nie udało się ${mode === 'add' ? 'dodać' : 'pobrać'} przedmiotu: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canPerformAction) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md text-center">
          <h2 className="text-lg font-semibold text-red-600">Brak uprawnień</h2>
          <p className="text-gray-600">
            {isAdd 
              ? "Nie masz uprawnień do dodawania przedmiotów do magazynu." 
              : "Nie masz uprawnień do pobierania przedmiotów z magazynu."}
          </p>
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

          {/* Dodajemy opcję pobierania zarezerwowanych, tylko dla trybu remove i dla uprawnionych */}
          {!isAdd && canRemoveReserved && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="removeReserved"
                className="mr-2"
                checked={removeReserved}
                onChange={(e) => setRemoveReserved(e.target.checked)}
              />
              <label htmlFor="removeReserved" className="text-sm text-gray-700">
                <span className="text-red-600 font-medium">Pobierz z zarezerwowanych przedmiotów</span>
              </label>
            </div>
          )}

          {/* Wyświetlamy informację o zarezerwowanych przedmiotach, jeśli istnieją */}
          {!isAdd && item.reserved > 0 && (
            <div className="text-sm text-gray-700 border-t pt-2">
              <p>
                <span className="font-medium">Dostępne: </span> 
                <span className="text-green-600">{item.quantity - item.reserved} {item.unit}</span>
              </p>
              <p>
                <span className="font-medium">Zarezerwowane: </span>
                <span className="text-amber-600">{item.reserved} {item.unit}</span>
              </p>
              {!canRemoveReserved && (
                <p className="text-red-600 text-xs mt-1">
                  ⚠️ Nie masz uprawnień do pobierania zarezerwowanych przedmiotów
                </p>
              )}
            </div>
          )}

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
              disabled={isSubmitting}
            >
              {isAdd ? 'Dodaj' : 'Pobierz'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
