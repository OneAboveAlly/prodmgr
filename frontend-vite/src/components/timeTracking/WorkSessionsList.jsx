// frontend/src/components/timeTracking/WorkSessionsList.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import timeTrackingApi from '../../api/timeTracking.api';

// Funkcja pomocnicza do formatowania sekund jako godziny i minuty
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const WorkSessionsList = ({ userId = null }) => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(5);
  const [filter, setFilter] = useState({
    from: '',
    to: ''
  });
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [noteText, setNoteText] = useState('');
  
  // Pobieranie sesji użytkownika z paginacją
  const { 
    data,
    isLoading,
    isError,
    error
  } = useQuery({
    queryKey: ['userSessions', userId, page, limit, filter],
    queryFn: () => userId
      ? timeTrackingApi.getUserSessionsById(userId, page, limit, filter).then(res => res.data)
      : timeTrackingApi.getUserSessions(page, limit, filter).then(res => res.data),
  });
  
  // Dodanie mutacji do aktualizacji notatek
  const updateNotesMutation = useMutation({
    mutationFn: ({ sessionId, notes }) => timeTrackingApi.updateSessionNotes(sessionId, notes),
    onSuccess: () => {
      toast.success('Notatki zaktualizowane pomyślnie');
      setEditingSessionId(null);
      queryClient.invalidateQueries({ queryKey: ['userSessions'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się zaktualizować notatek');
    }
  });
  
  // Obsługa zmian filtra dat
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Resetowanie do pierwszej strony przy zmianie filtrów
  };
  
  // Obsługa paginacji
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Obsługa edycji notatek
  const startEditingNotes = (session) => {
    setEditingSessionId(session.id);
    setNoteText(session.notes || '');
  };

  const saveNotes = () => {
    updateNotesMutation.mutate({
      sessionId: editingSessionId,
      notes: noteText
    });
  };

  const cancelEditingNotes = () => {
    setEditingSessionId(null);
    setNoteText('');
  };
  
  if (isLoading) {
    return <div className="text-center py-8">Ładowanie sesji...</div>;
  }
  
  if (isError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        Błąd: {error.message || 'Nie udało się załadować sesji'}
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Kontrolki filtrowania */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Od</label>
            <input
              type="date"
              name="from"
              value={filter.from}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Do</label>
            <input
              type="date"
              name="to"
              value={filter.to}
              onChange={handleFilterChange}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            />
          </div>
        </div>
      </div>
      
      {/* Statystyki podsumowujące */}
      {data?.stats && (
        <div className="p-4 border-b border-gray-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Całkowity czas pracy</div>
            <div className="text-xl font-semibold text-indigo-700">{formatDuration(data.stats.totalWorkDuration)}</div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Całkowity czas przerw</div>
            <div className="text-xl font-semibold text-green-700">{formatDuration(data.stats.totalBreakDuration)}</div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="text-sm text-gray-600">Ilość sesji</div>
            <div className="text-xl font-semibold text-blue-700">{data.stats.totalSessions}</div>
          </div>
        </div>
      )}
      
      {/* Lista sesji */}
      <div className="divide-y divide-gray-200">
        {data?.sessions?.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            Nie znaleziono sesji pracy dla wybranego okresu czasu.
          </div>
        ) : (
          data?.sessions?.map(session => (
            <div key={session.id} className="p-4 hover:bg-gray-50">
              <div className="flex flex-wrap justify-between">
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
                  <div className="text-sm text-gray-500 mt-1">
                    Czas trwania: {formatDuration(session.totalDuration)}
                    {session.breaks?.length > 0 && ` (${session.breaks.length} ${
                      session.breaks.length === 1 ? 'przerwa' : 
                      session.breaks.length < 5 ? 'przerwy' : 'przerw'
                    }: ${
                      formatDuration(session.breaks.reduce((total, b) => total + (b.duration || 0), 0))
                    })`}
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    session.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {session.status === 'active' ? 'Aktywna' : 'Zakończona'}
                  </span>
                </div>
              </div>
              
              {/* Sekcja notatek */}
              {editingSessionId === session.id ? (
                <div className="mt-3">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="w-full border border-gray-300 rounded-md p-2 text-sm mb-2"
                    rows="2"
                    placeholder="Dodaj notatki do tej sesji..."
                  ></textarea>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={cancelEditingNotes}
                      className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                    >
                      Anuluj
                    </button>
                    <button
                      onClick={saveNotes}
                      className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Zapisz
                    </button>
                  </div>
                </div>
              ) : (
                session.notes && (
                  <div className="mt-2">
                    <div className="text-sm text-gray-500 font-medium mb-1">Notatki:</div>
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      {session.notes}
                      {session.status === 'completed' && (
                        <button
                          onClick={() => startEditingNotes(session)}
                          className="ml-2 text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          Edytuj
                        </button>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Paginacja */}
      {data?.pagination && data.pagination.total > 0 && data.pagination.pages > 1 && (
        <div className="p-4 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Pokazano {((page - 1) * limit) + 1} do {Math.min(page * limit, data.pagination.total)} z {data.pagination.total} sesji
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-3 py-1 text-sm rounded ${
                page === 1
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Poprzednia
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= data.pagination.pages}
              className={`px-3 py-1 text-sm rounded ${
                page >= data.pagination.pages
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
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

export default WorkSessionsList;