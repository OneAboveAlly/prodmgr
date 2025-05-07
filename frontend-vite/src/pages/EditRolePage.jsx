import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RoleForm from '../components/forms/RoleForm';
import roleApi from '../api/role.api';
import { useAuth } from '../contexts/AuthContext';

const EditRolePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isReady, hasPermission, refetchMe } = useAuth();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [formData, setFormData] = useState(null);

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['role', id],
    queryFn: () => roleApi.getById(id).then((res) => res.data),
    enabled: isReady, // 🔑 czekamy aż auth się załaduje
  });

  const updateRoleMutation = useMutation({
    mutationFn: (roleData) => roleApi.update(id, roleData),
    onSuccess: async () => {
      toast.success('Rola zaktualizowana pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      await refetchMe(); // ⬅️ tutaj odświeżamy dane użytkownika
      navigate('/roles');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || 'Błąd podczas aktualizacji roli';
      toast.error(errorMsg);
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: () => roleApi.delete(id),
    onSuccess: async () => {
      toast.success('Rola usunięta pomyślnie');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      await refetchMe(); // Odświeżamy dane użytkownika również po usunięciu
      navigate('/roles');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || 'Błąd podczas usuwania roli';
      toast.error(errorMsg);
    },
  });

  const canEditRoles = hasPermission('roles', 'update');
  const canDeleteRoles = hasPermission('roles', 'delete');

  // 🔒 Blokujemy dostęp natychmiast, jeśli brak uprawnień, zamiast używać useEffect
  if (isReady && !canEditRoles) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Odmowa dostępu:</strong>
          <span className="block">Nie masz uprawnień do edycji ról.</span>
        </div>
      </div>
    );
  }

  if (!isReady || isLoading) return <div>Ładowanie...</div>;
  if (isError) return <div>Błąd: {error.message}</div>;

  const handleSubmit = (formData) => {
    if (
      JSON.stringify(formData.permissions) === JSON.stringify(data.permissions) &&
      formData.name === data.name &&
      formData.description === data.description
    ) {
      toast.info('Nie wykryto zmian');
      navigate('/roles');
      return;
    }
    setFormData(formData);
    setShowConfirmation(true);
  };

  const handleFormChange = () => {};

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-4 flex" aria-label="Ścieżka nawigacji">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
              Panel główny
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2">/</span>
              <Link to="/roles" className="text-gray-700 hover:text-blue-600">
                Role
              </Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2">/</span>
              <span className="text-gray-500">Edycja: {data.name}</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Edytuj rolę: {data.name}</h1>
          {canDeleteRoles && (
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Usuń rolę
            </button>
          )}
        </div>

        <RoleForm
          role={JSON.parse(JSON.stringify(data))} // głęboka kopia na wszelki wypadek
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          isLoading={updateRoleMutation.isPending}
        />
      </div>

      {/* MODAL POTWIERDZAJĄCY */}
      {showConfirmation && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-2">Potwierdź aktualizację</h2>
            <p>Czy na pewno chcesz zaktualizować tę rolę?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  updateRoleMutation.mutate(formData);
                  setShowConfirmation(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                Aktualizuj
              </button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL USUWANIA */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-2">Potwierdź usunięcie</h2>
            <p>Czy na pewno chcesz usunąć tę rolę?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  deleteRoleMutation.mutate();
                  setShowDeleteConfirmation(false);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >
                Usuń
              </button>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >
                Anuluj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRolePage;