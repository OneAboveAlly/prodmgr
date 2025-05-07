// frontend/src/components/timeTracking/ActiveUsersTracker.js
import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import timeTrackingApi from '../../api/timeTracking.api';
import userApi from '../../api/user.api';

// Funkcja pomocnicza do formatowania sekund
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m 0s';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours}h ${minutes}m ${secs}s`;
};

const ActiveUsersTracker = ({ filters = {} }) => {
  const [activeSessions, setActiveSessions] = useState({});
  const [elapsedTimes, setElapsedTimes] = useState({});
  const [expandedUser, setExpandedUser] = useState(null);
  
  // Pobieranie wszystkich użytkowników - aktualizacja do nowego formatu danych
  const { data, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(1, 100),
  });
  
  // Ekstrakcja listy użytkowników z nowego formatu danych
  const usersData = data?.users || [];
  
  // Log users data when it changes
  useEffect(() => {
    console.log('ACTIVE USERS TRACKER - USERS DATA:', usersData);
  }, [usersData]);
  
  // Pobieranie aktywnych sesji dla wszystkich użytkowników
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['active-sessions', filters.dateFrom, filters.dateTo],
    queryFn: async () => {
      // This is a new endpoint we'll need to create on the backend
      try {
        const response = await timeTrackingApi.getAllActiveSessions({
          from: filters.dateFrom || undefined,
          to: filters.dateTo || undefined
        });
        console.log('ACTIVE SESSIONS API RESPONSE:', response.data);
        return response.data;
      } catch (error) {
        console.error("Failed to fetch active sessions:", error);
        return [];
      }
    },
    refetchInterval: 30000, // Odświeżanie co 30 sekund
  });
  
  // Log sessions data when it changes
  useEffect(() => {
    console.log('ACTIVE SESSIONS DATA:', sessionsData);
  }, [sessionsData]);
  
  // Pobieranie ostatnich sesji użytkownika
  const { data: userSessions, isLoading: userSessionsLoading, refetch: refetchUserSessions } = useQuery({
    queryKey: ['user-sessions', expandedUser, filters.dateFrom, filters.dateTo],
    queryFn: () => {
      if (!expandedUser) return { sessions: [] };
      return timeTrackingApi.getUserSessionsById(
        expandedUser, 
        1, 
        10, 
        {
          from: filters.dateFrom || undefined,
          to: filters.dateTo || undefined
        }
      ).then(res => res.data);
    },
    enabled: !!expandedUser,
  });
  
  // Aktualizacja aktywnych sesji, gdy dane się zmieniają
  useEffect(() => {
    if (sessionsData) {
      const activeSessionsMap = {};
      sessionsData.forEach(session => {
        activeSessionsMap[session.userId] = session;
      });
      console.log('ACTIVE SESSIONS MAP:', activeSessionsMap);
      setActiveSessions(activeSessionsMap);
      
      // Inicjalizacja upływających czasów
      const initialElapsedTimes = {};
      sessionsData.forEach(session => {
        const startTime = new Date(session.startTime);
        const now = new Date();
        initialElapsedTimes[session.userId] = Math.floor((now - startTime) / 1000);
      });
      setElapsedTimes(prev => ({...prev, ...initialElapsedTimes}));
    }
  }, [sessionsData]);
  
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
  
  // Odświeżanie danych po zmianie filtrów
  useEffect(() => {
    refetchSessions();
    if (expandedUser) {
      refetchUserSessions();
    }
  }, [filters, refetchSessions, expandedUser, refetchUserSessions]);
  
  // Ręczne odświeżanie danych
  const handleRefresh = () => {
    refetchSessions();
    if (expandedUser) {
      refetchUserSessions();
    }
  };
  
  // Przełączanie szczegółów użytkownika
  const toggleUserDetails = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };
  
  if (usersLoading || sessionsLoading) {
    return <div className="text-center py-4">Ładowanie danych aktywności użytkowników...</div>;
  }
  
  // Stosowanie filtrów do listy użytkowników
  const filteredUsers = usersData.filter(user => {
    // Filtrowanie według wyszukiwanego terminu
    if (filters.searchTerm) {
      const searchTerm = filters.searchTerm.toLowerCase();
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const email = user.email.toLowerCase();
      const username = (user.username || '').toLowerCase();
      
      if (!fullName.includes(searchTerm) && 
          !email.includes(searchTerm) && 
          !username.includes(searchTerm)) {
        return false;
      }
    }
    
    // Filtrowanie według statusu
    if (filters.status && filters.status !== 'all') {
      const isActive = !!activeSessions[user.id];
      if (filters.status === 'active' && !isActive) return false;
      if (filters.status === 'inactive' && isActive) return false;
    }
    
    return true;
  });
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
        <h2 className="text-lg font-semibold">Monitor aktywnych pracowników</h2>
        <button 
          onClick={handleRefresh}
          className="px-3 py-1 bg-white text-indigo-600 rounded hover:bg-indigo-50"
        >
          Odśwież
        </button>
      </div>
      
      <div className="p-4">
        <p className="text-sm text-gray-500 mb-4">
          Ten panel pokazuje status aktywności wszystkich pracowników w czasie rzeczywistym. Kliknij na pracownika, aby zobaczyć jego ostatnie sesje.
        </p>
        
        {filteredUsers.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded">
            <p className="text-gray-500">Żaden pracownik nie pasuje do Twoich kryteriów filtrowania</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pracownik</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bieżąca sesja</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map(user => {
                  const isActive = !!activeSessions[user.id];
                  const sessionDuration = isActive ? elapsedTimes[user.id] || 0 : 0;
                  const activeSession = isActive ? activeSessions[user.id] : null;
                  
                  return (
                    <React.Fragment key={user.id}>
                      <tr className={`hover:bg-gray-50 ${expandedUser === user.id ? 'bg-blue-50 border-b border-blue-100' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive ? 'Aktywny' : 'Nieaktywny'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isActive ? (
                            <div>
                              <div className="text-sm text-gray-900">
                                Czas trwania: {formatDuration(sessionDuration)}
                              </div>
                              <div className="text-xs text-gray-500">
                                Rozpoczęto: {new Date(activeSession.startTime).toLocaleString()}
                              </div>
                              {activeSession.notes && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Notatki: {activeSession.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">Brak aktywnej sesji</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <button
                            onClick={() => toggleUserDetails(user.id)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {expandedUser === user.id ? 'Ukryj sesje' : 'Pokaż sesje'}
                          </button>
                        </td>
                      </tr>
                      
                      {/* Szczegóły sesji użytkownika */}
                      {expandedUser === user.id && (
                        <tr>
                          <td colSpan="4" className="bg-gray-50 px-6 py-4">
                            {userSessionsLoading ? (
                              <div className="text-center py-4">Ładowanie sesji użytkownika...</div>
                            ) : userSessions?.sessions?.length === 0 ? (
                              <div className="text-center py-4 text-gray-500">Brak danych sesji dla wybranego zakresu dat</div>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto">
                                {userSessions?.sessions?.map(session => (
                                  <div key={session.id} className="bg-white p-3 rounded border border-gray-200">
                                    <div className="flex justify-between">
                                      <div>
                                        <div className="font-medium">
                                          {new Date(session.startTime).toLocaleDateString()} ({
                                            new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                          } - {
                                            session.endTime 
                                              ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                              : 'W trakcie'
                                          })
                                        </div>
                                        <div className="text-sm text-gray-500">
                                          Czas trwania: {formatDuration(session.totalDuration || 0)}
                                        </div>
                                      </div>
                                      <span className={`px-2 h-fit py-1 text-xs font-semibold rounded-full ${
                                        session.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                      }`}>
                                        {session.status === 'active' ? 'Aktywna' : 'Zakończona'}
                                      </span>
                                    </div>
                                    
                                    {session.notes && (
                                      <div className="mt-2 text-sm text-gray-600">
                                        <span className="font-medium">Notatki:</span> {session.notes}
                                      </div>
                                    )}
                                    
                                    {session.breaks && session.breaks.length > 0 && (
                                      <div className="mt-2">
                                        <span className="text-xs font-medium text-gray-500">Przerwy:</span>
                                        <div className="ml-2 text-xs text-gray-500">
                                          {session.breaks.map((breakItem, i) => (
                                            <div key={breakItem.id || i}>
                                              {new Date(breakItem.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                              {breakItem.endTime && ` - ${new Date(breakItem.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                              {breakItem.duration && ` (${formatDuration(breakItem.duration)})`}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActiveUsersTracker;