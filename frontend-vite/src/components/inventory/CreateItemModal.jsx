// ✅ src/components/inventory/CreateItemModal.jsx
import React, { useState } from 'react';
import inventoryApi from '../../api/inventory.api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';

function generateBarcode() {
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `MAG-${randomPart}`;
}

export default function CreateItemModal({ onClose, onSuccess }) {
  const { hasPermission } = useAuth();
  const canCreate = hasPermission('inventory', 'create');
  const canEditPrice = hasPermission('inventory', 'manage', 1);

  const [form, setForm] = useState({
    name: '',
    quantity: 0,
    unit: 'szt',
    location: '',
    category: '',
    description: '',
    barcode: generateBarcode(),
    price: '',
    minQuantity: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const newItem = await inventoryApi.createInventoryItem({
        name: form.name,
        barcode: form.barcode,
        quantity: Number(form.quantity),
        unit: form.unit,
        minQuantity: form.minQuantity ? Number(form.minQuantity) : null,
        location: form.location || null,
        category: form.category || null,
        price: form.price ? Number(form.price) : null,
        description: form.description || null
      });
      
      toast.success('✅ Przedmiot został dodany do magazynu');
      onClose();
      if (onSuccess) onSuccess(newItem);
    } catch (err) {
      console.error('❌ Błąd dodawania przedmiotu:', err);
      toast.error(`Nie udało się dodać przedmiotu: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
        <div className="bg-white p-6 rounded shadow-lg">
          <h2 className="text-lg font-bold text-red-600">🚫 Brak uprawnień do dodawania przedmiotów</h2>
          <div className="mt-4 text-right">
            <button onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Zamknij</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-4">➕ Dodaj przedmiot</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="name" value={form.name} onChange={handleChange} required className="w-full border px-2 py-1 rounded" placeholder="Nazwa" />
          <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full border px-2 py-1 rounded font-mono text-sm" />

          <div className="flex gap-2">
            <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required min={0} className="flex-1 border px-2 py-1 rounded" />
            <select name="unit" value={form.unit} onChange={handleChange} className="border px-2 py-1 rounded">
              <option value="szt">szt</option>
              <option value="kg">kg</option>
              <option value="l">l</option>
              <option value="m">m</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Poziom ostrzegawczy (opcjonalny)</label>
            <input
              name="minQuantity"
              type="number"
              value={form.minQuantity || ''}
              onChange={handleChange}
              className="w-full border px-2 py-1 rounded"
              placeholder="Np. 5 lub 10"
            />
          </div>

          <input name="location" value={form.location} onChange={handleChange} className="w-full border px-2 py-1 rounded" placeholder="Lokalizacja" />
          <input name="category" value={form.category} onChange={handleChange} className="w-full border px-2 py-1 rounded" placeholder="Kategoria" />
          <textarea name="description" value={form.description} onChange={handleChange} className="w-full border px-2 py-1 rounded" placeholder="Opis (opcjonalnie)" />

          {canEditPrice && (
            <input type="number" step="0.01" name="price" value={form.price} onChange={handleChange} className="w-full border px-2 py-1 rounded" placeholder="Cena (opcjonalna)" />
          )}

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-1 rounded bg-gray-200 hover:bg-gray-300">Anuluj</button>
            <button type="submit" className="px-4 py-1 rounded bg-blue-600 text-white hover:bg-blue-700" disabled={isSubmitting}>Zapisz</button>
          </div>
        </form>
      </div>
    </div>
  );
}