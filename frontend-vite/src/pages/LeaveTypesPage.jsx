// frontend/src/pages/LeaveTypesPage.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import leaveApi from '../api/leave.api';
import { useAuth } from '../contexts/AuthContext';

const LeaveTypesPage = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    paid: true,
    color: '#4F46E5'
  });

  // Pobieranie typów urlopów
  const { data: leaveTypes, isLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveApi.getLeaveTypes().then(res => res.data)
  });

  // Mutacja tworzenia typu urlopu
  const createLeaveTypeMutation = useMutation({
    mutationFn: (data) => leaveApi.createLeaveType(data),
    onSuccess: () => {
      toast.success('Typ urlopu utworzony pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się utworzyć typu urlopu');
    }
  });

  // Mutacja aktualizacji typu urlopu
  const updateLeaveTypeMutation = useMutation({
    mutationFn: (data) => leaveApi.updateLeaveType(data.id, data),
    onSuccess: () => {
      toast.success('Typ urlopu zaktualizowany pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się zaktualizować typu urlopu');
    }
  });

  // Mutacja usunięcia typu urlopu
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: (id) => leaveApi.deleteLeaveType(id),
    onSuccess: () => {
      toast.success('Typ urlopu usunięty pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się usunąć typu urlopu');
    }
  });

  // Resetowanie formularza do stanu początkowego
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      paid: true,
      color: '#4F46E5'
    });
    setEditingLeaveType(null);
  };

  // Otwieranie modalu do utworzenia nowego typu urlopu
  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Otwieranie modalu do edycji istniejącego typu urlopu
  const openEditModal = (leaveType) => {
    setFormData({
      name: leaveType.name,
      description: leaveType.description || '',
      paid: leaveType.paid,
      color: leaveType.color
    });
    setEditingLeaveType(leaveType);
    setIsModalOpen(true);
  };

  // Zamykanie modalu
  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Obsługa zmian w formularzu
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Obsługa przesyłania formularza
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingLeaveType) {
      updateLeaveTypeMutation.mutate({
        id: editingLeaveType.id,
        ...formData
      });
    } else {
      createLeaveTypeMutation.mutate(formData);
    }
  };

  // Obsługa usuwania typu urlopu z potwierdzeniem
  const handleDeleteLeaveType = (id, name) => {
    if (window.confirm(`Czy na pewno chcesz usunąć typ urlopu "${name}"? Tej operacji nie można cofnąć.`)) {
      deleteLeaveTypeMutation.mutate(id);
    }
  };

  // Jeśli użytkownik nie ma wymaganych uprawnień, nie renderuj strony
  if (!hasPermission('leave', 'manageTypes')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Odmowa dostępu:</strong>
          <span className="block"> Nie masz uprawnień do zarządzania typami urlopów.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Typy urlopów</h1>
        <div className="flex gap-2">
          <button 
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Dodaj typ urlopu
          </button>
          <Link 
            to="/leave" 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Powrót do urlopów
          </Link>
        </div>
      </div>

      {/* Tabela typów urlopów */}
      {isLoading ? (
        <div className="text-center py-8">Ładowanie typów urlopów...</div>
      ) : leaveTypes?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">Nie znaleziono typów urlopów. Kliknij "Dodaj typ urlopu", aby utworzyć nowy.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Typ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Płatny
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveTypes?.map(leaveType => (
                <tr key={leaveType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="h-4 w-4 rounded-full mr-3"
                        style={{ backgroundColor: leaveType.color }}
                      ></div>
                      <span className="font-medium text-gray-900">{leaveType.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{leaveType.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      leaveType.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leaveType.paid ? 'Płatny' : 'Bezpłatny'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditModal(leaveType)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edytuj
                    </button>
                    <button
                      onClick={() => handleDeleteLeaveType(leaveType.id, leaveType.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Usuń
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal typu urlopu */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Tło modalu */}
            <div 
              className="fixed inset-0 bg-black opacity-50"
              onClick={closeModal}
            ></div>
            
            {/* Zawartość modalu */}
            <div className="bg-white rounded-lg shadow-xl z-10 w-full max-w-md">
              <div className="p-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingLeaveType ? 'Edytuj typ urlopu' : 'Dodaj typ urlopu'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-5">
                {/* Nazwa */}
                <div className="mb-4">
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nazwa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                
                {/* Opis */}
                <div className="mb-4">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Opis
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="3"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  ></textarea>
                </div>
                
                {/* Płatny */}
                <div className="mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="paid"
                      name="paid"
                      checked={formData.paid}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="paid" className="ml-2 block text-sm font-medium text-gray-700">
                      Płatny urlop
                    </label>
                  </div>
                </div>
                
                {/* Kolor */}
                <div className="mb-4">
                  <label htmlFor="color" className="block text-sm font-medium text-gray-700 mb-1">
                    Kolor
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id="color"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="h-8 w-8 border-0 p-0 mr-2"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={handleChange}
                      name="color"
                      className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Anuluj
                  </button>
                  
                  <button
                    type="submit"
                    disabled={createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                  >
                    {createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending 
                      ? 'Zapisywanie...' 
                      : editingLeaveType ? 'Aktualizuj' : 'Utwórz'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTypesPage;