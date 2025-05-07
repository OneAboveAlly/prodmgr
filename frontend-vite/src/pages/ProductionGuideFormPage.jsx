import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api.service';
import InventoryItemSelector from '../components/inventory/InventoryItemSelector';

// Funkcja pobierająca dane przewodnika
const fetchGuide = async (id) => {
  const response = await api.get(`/production/guides/${id}`);
  return response.data.guide;
};

// Funkcja pobierająca przedmioty przypisane do przewodnika
const fetchGuideInventory = async (id) => {
  const response = await api.get(`/inventory/guides/${id}/items`);
  return response.data.items || [];
};

// Funkcja pobierająca dostępnych użytkowników
const fetchUsers = async () => {
  const response = await api.get('/users');
  return response.data.users || [];
};

const ProductionGuideFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  
  // Podstawowe dane formularza
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    deadline: '',
    assignedUsers: []
  });
  
  // Przedmioty magazynowe
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  
  // Stan przetwarzania formularza
  const [submitting, setSubmitting] = useState(false);
  
  // Pobieranie danych do edycji
  const { isLoading: isLoadingGuide } = useQuery(
    ['guide', id],
    () => fetchGuide(id),
    {
      enabled: isEditing,
      onSuccess: (data) => {
        if (data) {
          setFormData({
            title: data.title || '',
            description: data.description || '',
            priority: data.priority || 'NORMAL',
            deadline: data.deadline ? new Date(data.deadline).toISOString().split('T')[0] : '',
            assignedUsers: data.assignedUsers?.map(u => u.userId) || []
          });
        }
      }
    }
  );
  
  // Pobieranie przedmiotów przewodnika do edycji
  useQuery(
    ['guideInventory', id],
    () => fetchGuideInventory(id),
    {
      enabled: isEditing,
      onSuccess: (data) => {
        if (data) {
          const formattedItems = data.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            item: {
              name: item.item.name,
              unit: item.item.unit
            }
          }));
          setSelectedInventoryItems(formattedItems);
        }
      }
    }
  );
  
  // Pobieranie użytkowników do przypisania
  const { data: users = [] } = useQuery(
    ['users'],
    fetchUsers
  );
  
  // Obsługa zmiany w formularzu
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Obsługa zmiany przypisanych użytkowników
  const handleUserAssignment = (e) => {
    const { value, checked } = e.target;
    setFormData(prev => {
      if (checked) {
        return {
          ...prev,
          assignedUsers: [...prev.assignedUsers, value]
        };
      } else {
        return {
          ...prev,
          assignedUsers: prev.assignedUsers.filter(id => id !== value)
        };
      }
    });
  };
  
  // Obsługa zmiany przedmiotów magazynowych
  const handleInventoryItemsChange = (items) => {
    setSelectedInventoryItems(items);
  };
  
  // Zapisywanie formularza
  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    
    try {
      const dataToSend = {
        ...formData,
        inventoryItems: selectedInventoryItems.map(item => ({
          itemId: item.itemId,
          quantity: item.quantity
        }))
      };
      
      let response;
      
      if (isEditing) {
        response = await api.put(`/production/guides/${id}`, dataToSend);
      } else {
        response = await api.post('/production/guides', dataToSend);
      }
      
      const savedGuide = response.data.guide;
      toast.success(`Przewodnik produkcyjny ${isEditing ? 'zaktualizowany' : 'utworzony'} pomyślnie!`);
      navigate(`/production/guides/${savedGuide.id}`);
    } catch (error) {
      console.error('Błąd podczas zapisywania przewodnika:', error);
      toast.error('Nie udało się zapisać przewodnika produkcyjnego.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (isEditing && isLoadingGuide) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">
        {isEditing ? 'Edytuj przewodnik produkcyjny' : 'Utwórz nowy przewodnik produkcyjny'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Podstawowe dane */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Informacje podstawowe</h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tytuł <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priorytet
              </label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="LOW">Niski</option>
                <option value="NORMAL">Normalny</option>
                <option value="HIGH">Wysoki</option>
                <option value="CRITICAL">Krytyczny</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Termin realizacji
              </label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opis
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="4"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              ></textarea>
            </div>
          </div>
        </div>
        
        {/* Przypisani użytkownicy */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Przypisz użytkowników</h2>
          {users.length === 0 ? (
            <p className="text-gray-500">Ładowanie użytkowników...</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {users.map(user => (
                <div key={user.id} className="flex items-start">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    value={user.id}
                    checked={formData.assignedUsers.includes(user.id)}
                    onChange={handleUserAssignment}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`user-${user.id}`} className="ml-2 block text-sm text-gray-700">
                    {user.firstName} {user.lastName}
                    {user.role && <span className="text-xs text-gray-500 block">{user.role}</span>}
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Przedmioty magazynowe */}
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Przedmioty z magazynu</h2>
          <p className="text-sm text-gray-500 mb-4">
            Wybierz przedmioty, które będą potrzebne do realizacji tego przewodnika. Wybrane przedmioty zostaną zarezerwowane.
          </p>
          <InventoryItemSelector
            selectedItems={selectedInventoryItems}
            onItemsChange={handleInventoryItemsChange}
            readOnly={false}
          />
        </div>
        
        {/* Przyciski formularza */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {submitting
              ? 'Zapisywanie...'
              : isEditing
                ? 'Zapisz zmiany'
                : 'Utwórz przewodnik'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductionGuideFormPage;