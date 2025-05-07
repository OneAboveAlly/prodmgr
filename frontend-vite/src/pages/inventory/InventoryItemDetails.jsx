import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import inventoryApi from '../../api/inventory.api';
import { useAuth } from "../../contexts/AuthContext";
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';


export default function InventoryItemDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [item, setItem] = useState({ transactions: [] });
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      const data = await inventoryApi.getInventoryItemById(id);
      // Upewniamy się, że transactions zawsze istnieje
      data.transactions = data.transactions || [];
      setItem(data);
      setForm({ ...data });
    } catch (err) {
      console.error('Błąd ładowania szczegółów:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await inventoryApi.updateInventoryItem(id, form);
      toast.success('✅ Przedmiot zaktualizowany');
      setEditMode(false);
      fetchItem();
    } catch (err) {
      console.error('❌ Błąd aktualizacji:', err);
      toast.error('Nie udało się zapisać zmian');
    }
  };

  if (loading) return <div className="p-4">⏳ Ładowanie danych...</div>;
  if (!item) return <div className="p-4 text-red-600">❌ Przedmiot nie został znaleziony</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">{item.name}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-sm text-blue-600"
          >⬅️ Powrót</button>
          
          {/* Przycisk pobierania przedmiotu - dla użytkowników z uprawnieniami do pobierania przedmiotów */}
          {hasPermission('inventory', 'issue') && (
            <button
              onClick={() => navigate(`/inventory/items/withdraw/${item.id}`)}
              className="text-sm bg-red-500 text-white px-3 py-1 rounded"
            >
              ↩️ Pobierz przedmiot
            </button>
          )}
          
          {/* Przycisk edycji - tylko dla użytkowników z uprawnieniami update */}
          {hasPermission('inventory', 'update') && (
            <Link
            to={`/inventory/items/edit/${item.id}`}
            className="text-sm bg-yellow-500 text-white px-3 py-1 rounded"
          >
            ✏️ Edytuj
          </Link>
          )}
        </div>
      </div>

      {editMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="name" value={form.name} onChange={handleChange} className="border px-2 py-1 rounded" />
          <input name="barcode" value={form.barcode} onChange={handleChange} className="border px-2 py-1 rounded" />
          <input name="quantity" type="number" value={form.quantity} onChange={handleChange} className="border px-2 py-1 rounded" />
          <input name="unit" value={form.unit} onChange={handleChange} className="border px-2 py-1 rounded" />
          <input name="location" value={form.location || ''} onChange={handleChange} className="border px-2 py-1 rounded" />
          <input name="category" value={form.category || ''} onChange={handleChange} className="border px-2 py-1 rounded" />
          <input name="minQuantity" type="number" value={form.minQuantity || ''} onChange={handleChange} className="border px-2 py-1 rounded" />
          {hasPermission('inventory', 'read', 2) && (
            <input name="price" type="number" value={form.price || ''} onChange={handleChange} className="border px-2 py-1 rounded" placeholder="Cena" />
          )}
          <textarea name="description" value={form.description || ''} onChange={handleChange} className="border px-2 py-1 rounded md:col-span-2" />
          <div className="md:col-span-2 flex justify-end">
            <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">💾 Zapisz</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <p><strong>Kod:</strong> {item.barcode}</p>
            <p><strong>Ilość całkowita:</strong> {item.quantity} {item.unit}</p>
            <p><strong>Zarezerwowana:</strong> {item.reserved}</p>
            <p><strong>Dostępna:</strong> {item.available}</p>
            <p><strong>Minimalna ilość:</strong> {item.minQuantity ?? '-'}</p>
            {item.minQuantity != null && item.quantity < item.minQuantity && (
              <p className="text-red-600 font-semibold">⚠️ Stan magazynowy poniżej minimalnego poziomu!</p>
            )}
            <p><strong>Kategoria:</strong> {item.category || '-'}</p>
            <p><strong>Lokalizacja:</strong> {item.location || '-'}</p>
            {hasPermission('inventory', 'read', 2) && (
              <p><strong>Cena:</strong> {item.price ? `${item.price.toFixed(2)} zł` : '—'}</p>
            )}
          </div>
          <div>
            <p><strong>Opis:</strong></p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{item.description || '—'}</p>
            {item.attachments?.length > 0 && (
              <div className="mt-4">
                <p className="font-medium">📎 Załączniki:</p>
                <ul className="list-disc pl-5 text-sm">
                  {item.attachments.map(att => (
                    <li key={att.id}>
                      <a href={`/${att.path}`} className="text-blue-600 underline" target="_blank" rel="noreferrer">
                        {att.filename} ({(att.size / 1024).toFixed(1)} KB)
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <hr className="my-6" />

      {/* Sekcja historii transakcji - widoczna tylko dla użytkowników z uprawnieniami do zarządzania */}
      {hasPermission('inventory', 'manage', 1) ? (
        <div>
          <h2 className="text-xl font-semibold mb-2">📜 Historia transakcji</h2>
          {item.transactions?.length === 0 ? (
            <p className="text-sm text-gray-500">Brak transakcji.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Data</th>
                    <th className="p-2 text-left">Typ</th>
                    <th className="p-2 text-left">Ilość</th>
                    <th className="p-2 text-left">Użytkownik</th>
                    <th className="p-2 text-left">Powód</th>
                  </tr>
                </thead>
                <tbody>
                  {item.transactions?.map(tx => (
                    <tr key={tx.id} className="border-t">
                      <td className="p-2">{new Date(tx.createdAt).toLocaleString()}</td>
                      <td className="p-2">{tx.type}</td>
                      <td className="p-2">{tx.quantity}</td>
                      <td className="p-2">{tx.user.firstName} {tx.user.lastName}</td>
                      <td className="p-2">{tx.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}