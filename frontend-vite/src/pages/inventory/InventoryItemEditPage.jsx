// ✅ src/pages/inventory/InventoryItemEditPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import inventoryApi from '../../api/inventory.api';

export default function InventoryItemEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    unit: '',
    location: '',
    quantity: 0,
    minQuantity: '',
    category: '',
    price: '',
    barcode: ''
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const loadItem = async () => {
      try {
        const data = await inventoryApi.getInventoryItemById(id);
        setForm({
          name: data.name || '',
          description: data.description || '',
          unit: data.unit || '',
          location: data.location || '',
          quantity: data.quantity || 0,
          minQuantity: data.minQuantity || '',
          category: data.category || '',
          price: data.price || '',
          barcode: data.barcode || ''
        });
      } catch (err) {
        console.error('Błąd pobierania danych przedmiotu:', err);
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await inventoryApi.updateInventoryItem(id, form);
      setMessage('✅ Zmiany zapisane pomyślnie.');
      setTimeout(() => navigate(`/inventory/items/${id}`), 1500);
    } catch (err) {
      console.error('Błąd aktualizacji:', err);
      setMessage('❌ Wystąpił błąd przy aktualizacji.');
    }
  };

  if (loading) return <div>⏳ Ładowanie...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">✏️ Edytuj przedmiot magazynowy</h1>
      {message && <p className="mb-4 text-blue-700">{message}</p>}
      <form onSubmit={handleSubmit} className="grid gap-4">
        <label>
          Nazwa:
          <input name="name" placeholder="Nazwa" title="Nazwa przedmiotu" value={form.name} onChange={handleChange} className="border p-2 rounded w-full" required />
        </label>
        <label>
          Opis:
          <textarea name="description" placeholder="Opis" title="Dodatkowy opis przedmiotu" value={form.description} onChange={handleChange} className="border p-2 rounded w-full" rows={2} />
        </label>
        <label>
          Jednostka:
          <select name="unit" value={form.unit} onChange={handleChange} className="border p-2 rounded w-full" title="Jednostka miary (np. szt, m, kg)" required>
            <option value="">Wybierz jednostkę</option>
            <option value="szt">szt</option>
            <option value="kg">kg</option>
            <option value="m">m</option>
            <option value="l">l</option>
            <option value="opak">opak</option>
          </select>
        </label>
        <label>
          Lokalizacja:
          <input name="location" placeholder="Lokalizacja" title="Gdzie znajduje się przedmiot w magazynie" value={form.location} onChange={handleChange} className="border p-2 rounded w-full" />
        </label>
        <label>
          Kategoria:
          <input name="category" placeholder="Kategoria" title="Typ przedmiotu, np. Śruby, narzędzia" value={form.category} onChange={handleChange} className="border p-2 rounded w-full" />
        </label>
        <label>
          Kod kreskowy:
          <input name="barcode" placeholder="Kod kreskowy" title="Automatycznie generowany kod identyfikacyjny" value={form.barcode} onChange={handleChange} className="border p-2 rounded w-full" disabled />
        </label>
        <label>
          Ilość:
          <input name="quantity" type="number" placeholder="Ilość" title="Aktualna ilość przedmiotu w magazynie" value={form.quantity} onChange={handleChange} className="border p-2 rounded w-full" required />
        </label>
        <label>
          Minimalna ilość:
          <input name="minQuantity" type="number" placeholder="Min. ilość (opcjonalnie)" title="Minimalna ilość do powiadomień" value={form.minQuantity} onChange={handleChange} className="border p-2 rounded w-full" />
        </label>
        <label>
          Cena:
          <input name="price" type="number" placeholder="Cena (opcjonalnie)" title="Cena jednostkowa (brutto)" value={form.price} onChange={handleChange} className="border p-2 rounded w-full" />
        </label>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate(-1)} className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400">↩ Powrót</button>
          <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            💾 Zapisz
          </button>
        </div>
      </form>
    </div>
  );
}
