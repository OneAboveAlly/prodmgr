import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import userApi from '../api/user.api';
import timeTrackingApi from '../api/timeTracking.api';
import { useAuth } from '../contexts/AuthContext';

// Funkcja pomocnicza do formatowania czasu
const formatDuration = (seconds) => {
  if (!seconds) return '0g 0m 0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}g ${minutes}m ${secs}s`;
};

const UsersPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSessions, setActiveSessions] = useState({});
  const [elapsedTimes, setElapsedTimes] = useState({});
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { hasPermission, isReady } = useAuth();
  const { user } = useAuth();
console.log('🧠 ZALOGOWANY UŻYTKOWNIK:', user);

  // Pobieranie użytkowników z paginacją
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => userApi.getAll(page, limit),
    enabled: isReady // Pobieranie tylko gdy autoryzacja jest gotowa
  });

  console.log('DATA FROM API:', data);
  
  // Pobieranie aktywnych sesji
  const { data: activeSessData } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: async () => {
      try {
        const response = await timeTrackingApi.getAllActiveSessions();
        return response.data;
      } catch (error) {
        console.error("Nie udało się pobrać aktywnych sesji:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Odświeżanie co 30 sekund
    enabled: hasPermission('timeTracking', 'viewAll')
  });
  
  // Aktualizacja aktywnych sesji, gdy dane się zmieniają
  useEffect(() => {
    if (activeSessData) {
      const activeSessionsMap = {};
      activeSessData.forEach(session => {
        activeSessionsMap[session.userId] = session;
      });
      setActiveSessions(activeSessionsMap);
      
      // Inicjalizacja upływających czasów
      const initialElapsedTimes = {};
      activeSessData.forEach(session => {
        const startTime = new Date(session.startTime);
        const now = new Date();
        initialElapsedTimes[session.userId] = Math.floor((now - startTime) / 1000);
      });
      setElapsedTimes(prev => ({...prev, ...initialElapsedTimes}));
    }
  }, [activeSessData]);
  
  // Aktualizacja timera dla aktywnych sesji
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTimes(prev => {
        const updated = {...prev};
        Object.keys(activeSessions).forEach(userId => {
          if (updated[userId] !== undefined) {
            updated[userId] += 1;
          }
        });
        return updated;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [activeSessions]);
  
  // Ekstrakcja listy użytkowników i informacji o paginacji
  const users = data?.users || [];
  const pagination = data?.pagination;
  
  // Mutacja usunięcia użytkownika
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => userApi.delete(userId),
    onSuccess: () => {
      toast.success('Użytkownik został pomyślnie usunięty');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Błąd podczas usuwania użytkownika');
    }
  });
  
  // Obsługa paginacji
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Obsługa usunięcia użytkownika z potwierdzeniem
  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Czy na pewno chcesz usunąć użytkownika ${userName}?`)) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  // Obsługa dodania nowego użytkownika
  const handleAddUser = () => {
    navigate('/users/new');
  };
  
  // Obsługa edycji użytkownika
  const handleEditUser = (userId) => {
    navigate(`/users/edit/${userId}`);
  };

  // Filtrowanie użytkowników
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.login && user.login.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === '' || 
      user.roles.some(role => role.name.toLowerCase() === roleFilter.toLowerCase());
    
    const isActive = !!activeSessions[user.id];
    const matchesStatus = statusFilter === '' || 
      (statusFilter === 'active' && isActive) || 
      (statusFilter === 'inactive' && !isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });
  
  // Unikalne role do filtrowania
  const allRoles = users.reduce((acc, user) => {
    user.roles.forEach(role => {
      if (!acc.includes(role.name)) {
        acc.push(role.name);
      }
    });
    return acc;
  }, []);
  
  // Obsługa resetowania filtrów
  const handleResetFilters = () => {
    setSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
  };
  
  // Jeśli ładowanie lub autoryzacja nie jest gotowa
  if (!isReady || isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Ładowanie użytkowników...</div>
      </div>
    );
  }
  
  // Jeśli wystąpił błąd
  if (isError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Błąd!</strong>
        <span className="block sm:inline"> {error.response?.data?.message || 'Błąd podczas ładowania użytkowników'}</span>
      </div>
    );
  }

  // Jeśli brak danych lub pusta tablica
  if (!filteredUsers || filteredUsers.length === 0 && !searchTerm && !roleFilter && !statusFilter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Użytkownicy</h1>
          {hasPermission('users', 'create') && (
            <button 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleAddUser}
            >
              Dodaj nowego użytkownika
            </button>
          )}
        </div>
        
        <div className="bg-white shadow-md rounded p-6 text-center text-gray-500">
          Nie znaleziono użytkowników. Kliknij "Dodaj nowego użytkownika", aby utworzyć nowego.
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Użytkownicy</h1>
        {hasPermission('users', 'create') && (
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleAddUser}
          >
            Dodaj nowego użytkownika
          </button>
        )}
      </div>
      
      {/* Filtry */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4">
          {/* Filtr wyszukiwania */}
          <div className="flex-grow min-w-[200px]">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Wyszukaj
            </label>
            <input
              type="text"
              id="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Imię, nazwisko, email, login..."
              className="w-full border border-gray-300 rounded-md shadow-sm p-2"
            />
          </div>
          
          {/* Filtr ról */}
          <div className="w-48">
            <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Rola
            </label>
            <select
              id="roleFilter"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">Wszystkie role</option>
              {allRoles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
          
          {/* Filtr statusu */}
          <div className="w-48">
            <label htmlFor="statusFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Status pracy
            </label>
            <select
              id="statusFilter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2"
            >
              <option value="">Wszystkie statusy</option>
              <option value="active">Pracuje</option>
              <option value="inactive">Nie pracuje</option>
            </select>
          </div>
          
          {/* Przycisk resetowania */}
          <div className="flex items-end">
            <button
              onClick={handleResetFilters}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Resetuj filtry
            </button>
          </div>
        </div>
      </div>
      
      {/* Tabela użytkowników */}
      <div className="overflow-x-auto bg-white shadow-md rounded">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Imię i nazwisko</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status pracy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Czas pracy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(user => {
              const isActive = !!activeSessions[user.id];
              const sessionDuration = isActive ? elapsedTimes[user.id] || 0 : 0;
              
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.login}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span 
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                    >
                      {isActive ? 'Pracuje' : 'Nie pracuje'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {isActive ? formatDuration(sessionDuration) : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {user.roles?.map(role => 
                        <span key={role.id} className="mr-1 px-2 py-1 bg-gray-200 rounded text-xs">
                          {role.name}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {hasPermission('users', 'update', 2) && (
                      <button 
                        onClick={() => handleEditUser(user.id)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Edytuj
                      </button>
                    )}
                    {hasPermission('users', 'delete', 2) && (
                      <button 
                        onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Usuń
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan="7" className="px-6 py-4 text-center text-sm text-gray-500">
                  Nie znaleziono użytkowników spełniających kryteria wyszukiwania
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Paginacja */}
      {pagination && pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500">
            Pokazano {((page - 1) * limit) + 1} do {Math.min(page * limit, pagination.total)} z {pagination.total} użytkowników
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-3 py-1 rounded ${
                page === 1 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Poprzednia
            </button>
            
            {[...Array(pagination.pages).keys()].map(i => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1 rounded ${
                  page === i + 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === pagination.pages}
              className={`px-3 py-1 rounded ${
                page === pagination.pages 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Następna
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;