import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';

import Input from '../../components/common/Input';
import Spinner from '../../components/common/Spinner';

import api from '../../services/api.service';
import productionApi from '../../api/production.api';

const AssignedUsersPanel = ({ guideId }) => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // 📥 Pobieranie przypisanych użytkowników
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['assignedUsers', guideId],
    queryFn: () => productionApi.getAssignedUsers(guideId),
    select: (data) => data.users || [],
    onError: (err) => {
      console.error('Error fetching assigned users:', err);
      toast.error('Błąd pobierania przypisanych użytkowników');
    }
  });

  // ➕ Przypisanie użytkownika po emailu
  const assignUser = useMutation({
    mutationFn: async (email) => {
      setIsSearching(true);
      try {
        const userResponse = await api.get(`/users/email/${email}`);
        const userData = userResponse.data;
        
        if (!userData || !userData.id) {
          throw new Error('Nie znaleziono użytkownika o podanym adresie email');
        }
        
        return productionApi.assignUser(guideId, userData.id);
      } catch (error) {
        console.error('Error assigning user:', error);
        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    onSuccess: () => {
      toast.success('✅ Użytkownik przypisany!');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['assignedUsers', guideId] });
    },
    onError: (err) => {
      console.error('Error in assignment process:', err);
      toast.error(err.message || 'Błąd przypisywania użytkownika');
    },
  });

  // 🗑️ Usuwanie przypisanego użytkownika
  const removeUser = useMutation({
    mutationFn: (userId) => productionApi.removeUser(guideId, userId),
    onSuccess: () => {
      toast.success('🗑️ Użytkownik usunięty');
      queryClient.invalidateQueries({ queryKey: ['assignedUsers', guideId] });
    },
    onError: (err) => {
      console.error('Error removing user:', err);
      toast.error('❌ Błąd usuwania użytkownika');
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (email) {
      assignUser.mutate(email);
    }
  };

  if (isLoading) return <Spinner label="Ładowanie użytkowników..." />;
  
  if (isError) return (
    <div className="bg-white p-4 rounded-xl shadow space-y-4 border border-gray-200">
      <h2 className="text-lg font-bold text-gray-800">👥 Przypisani użytkownicy</h2>
      <p className="text-red-600">Błąd: {error?.message || 'Nie można pobrać danych użytkowników'}</p>
    </div>
  );

  const assignedUsers = data || [];

  return (
    <div className="bg-white p-4 rounded-xl shadow space-y-4 border border-gray-200">
      <h2 className="text-lg font-bold text-gray-800">👥 Przypisani użytkownicy</h2>

      {assignedUsers.length === 0 ? (
        <p className="italic text-gray-500">Brak przypisanych użytkowników</p>
      ) : (
        <ul className="space-y-1">
          {assignedUsers.map((user) => (
            <li key={user.id} className="flex justify-between items-center border-b py-2">
              <span>
                {user.firstName} {user.lastName}{' '}
                <span className="text-sm text-gray-500">({user.email || user.login})</span>
              </span>
              <button
                onClick={() => removeUser.mutate(user.id)}
                className="text-sm text-red-600 hover:underline"
                disabled={removeUser.isLoading}
              >
                {removeUser.isLoading ? 'Usuwanie...' : 'Usuń'}
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          placeholder="Email użytkownika"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={assignUser.isLoading || isSearching}
        />
        <button
          type="submit"
          className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          disabled={!email || assignUser.isLoading || isSearching}
        >
          {assignUser.isLoading || isSearching ? 'Przypisywanie...' : '➕ Przypisz'}
        </button>
      </form>
    </div>
  );
};

export default AssignedUsersPanel;