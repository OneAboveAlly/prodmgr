// frontend/src/pages/TimeTrackingReportsPage.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import * as XLSX from 'xlsx';
import timeTrackingApi from '../api/timeTracking.api';
import userApi from '../api/user.api';
import { useAuth } from '../contexts/AuthContext';

// Helper function to format seconds as hours and minutes
const formatDuration = (seconds) => {
  if (!seconds) return '0h 0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
};

const TimeTrackingReportsPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // First day of current month
    endDate: new Date().toISOString().split('T')[0] // Today
  });
  
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [reportData, setReportData] = useState(null);
  
  // Check permission and redirect if needed
  useEffect(() => {
    if (!hasPermission('timeTracking', 'viewReports')) {
      navigate('/time-tracking');
    }
  }, [hasPermission, navigate]);
  
  // Fetch all users - aktualizacja do nowego formatu danych
  const { data, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userApi.getAll(1, 100),
  });
  
  // Ekstrakcja listy użytkowników z nowego formatu danych
  const usersData = data?.users || [];

  useEffect(() => {
    console.log('USERS DATA FROM QUERY:', usersData);
  }, [usersData]);
  
  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: ({ userIds, startDate, endDate }) => 
      timeTrackingApi.getReport(userIds, startDate, endDate).then(res => res.data),
    onSuccess: (data) => {
        console.log("REPORT DATA:", data);
      setReportData(data);
      toast.success('Raport wygenerowany pomyślnie');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się wygenerować raportu');
    }
  });
  
  // Handle date range changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };
  
  // Handle user selection
  const handleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  // Select all users
  const selectAllUsers = () => {
    if (usersData) {
      setSelectedUserIds(usersData.map(user => user.id));
    }
  };
  
  // Deselect all users
  const deselectAllUsers = () => {
    setSelectedUserIds([]);
  };
  
  // Generate the report
  const handleGenerateReport = () => {
    if (selectedUserIds.length === 0) {
      toast.error('Wybierz co najmniej jednego pracownika');
      return;
    }
    
    generateReportMutation.mutate({
      userIds: selectedUserIds,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
  };
  
  // Export report to Excel
  const exportToExcel = () => {
    if (!reportData || reportData.length === 0) {
      toast.error('Brak danych raportu do eksportu');
      return;
    }
    
    try {
      // Spłaszczamy dane dla Excela
      const summaryData = reportData.map(userData => ({
        'Pracownik': userData.name,
        'Liczba sesji': userData.sessionCount,
        'Czas pracy (godz.)': Math.round((userData.totalWorkDuration / 3600) * 100) / 100,
        'Czas przerw (godz.)': Math.round((userData.totalBreakDuration / 3600) * 100) / 100,
        'Dni robocze': userData.dailyData.length,
      }));

      // Tworzymy szczegółowe dane dzienne
      const detailedData = [];
      reportData.forEach(userData => {
        userData.dailyData.forEach(day => {
          detailedData.push({
            'Pracownik': userData.name,
            'Data': day.date,
            'Liczba sesji': day.sessions.length,
            'Czas pracy (godz.)': Math.round((day.workDuration / 3600) * 100) / 100,
            'Czas przerw (godz.)': Math.round((day.breakDuration / 3600) * 100) / 100,
          });
        });
      });

      // Tworzymy dane dla notatek sesji
      const notesData = [];
      reportData.forEach(userData => {
        userData.dailyData.forEach(day => {
          day.sessions.forEach(session => {
            if (session.notes) {
              notesData.push({
                'Pracownik': userData.name,
                'Data': day.date,
                'Rozpoczęcie': new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                'Zakończenie': session.endTime 
                  ? new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : 'W trakcie',
                'Typ': session.type === 'work' ? 'Praca' : 'Przerwa',
                'Notatki': session.notes || ''
              });
            }
          });
        });
      });

      // Tworzymy nowy skoroszyt
      const workbook = XLSX.utils.book_new();

      // Dodajemy arkusz podsumowania
      const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Podsumowanie');

      // Dodajemy arkusz ze szczegółowymi danymi dziennymi
      const detailedWorksheet = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedWorksheet, 'Szczegóły dzienne');

      // Dodajemy arkusz z notatkami sesji, jeśli są
      if (notesData.length > 0) {
        const notesWorksheet = XLSX.utils.json_to_sheet(notesData);
        XLSX.utils.book_append_sheet(workbook, notesWorksheet, 'Notatki sesji');
      }

      // Generujemy nazwę pliku
      const fileName = `raport_czasu_pracy_${new Date().toISOString().slice(0, 10)}.xlsx`;

      // Zapisujemy plik i inicjujemy pobieranie
      XLSX.writeFile(workbook, fileName);

      toast.success('Raport wyeksportowany pomyślnie');
    } catch (error) {
      console.error('Błąd podczas eksportu do Excel:', error);
      toast.error('Nie udało się wyeksportować raportu');
    }
  };

  // If the user doesn't have the required permission, we don't render anything
  // The useEffect above will handle the redirect
  if (!hasPermission('timeTracking', 'viewReports')) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Raporty czasu pracy</h1>
        <div className="flex space-x-2">
          <Link
            to="/time-tracking/users-activity"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Monitoruj aktywnych pracowników
          </Link>
          <button
            onClick={() => navigate('/time-tracking')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Powrót do śledzenia czasu
          </button>
        </div>
      </div>
      
      {/* Report Controls */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Generuj raport</h2>
        
        {/* Date Range Selection */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Zakres dat</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data początkowa</label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Data końcowa</label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                min={dateRange.startDate}
                className="w-full border border-gray-300 rounded-md p-2"
              />
            </div>
          </div>
        </div>
        
        {/* User Selection */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium text-gray-700">Wybierz pracowników</h3>
            <div className="space-x-2">
              <button
                onClick={selectAllUsers}
                className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
              >
                Wybierz wszystkich
              </button>
              <button
                onClick={deselectAllUsers}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                Odznacz wszystkich
              </button>
            </div>
          </div>
          
          {usersLoading ? (
            <div className="text-center py-4">Ładowanie pracowników...</div>
          ) : (
            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md p-2">
              {Array.isArray(usersData) && usersData.map(user => (
                <div key={user.id} className="flex items-center p-2 hover:bg-gray-50">
                  <input
                    type="checkbox"
                    id={`user-${user.id}`}
                    checked={selectedUserIds.includes(user.id)}
                    onChange={() => handleUserSelection(user.id)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`user-${user.id}`} className="ml-2 text-sm text-gray-700 cursor-pointer">
                    {user.firstName} {user.lastName}
                  </label>
                </div>
              ))}
              
              {(!usersData || usersData.length === 0) && (
                <div className="p-4 text-center text-gray-500">Nie znaleziono pracowników</div>
              )}
            </div>
          )}
        </div>
        
        {/* Generate Report Button */}
        <div className="flex justify-end">
          <button
            onClick={handleGenerateReport}
            disabled={generateReportMutation.isPending || selectedUserIds.length === 0}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300"
          >
            {generateReportMutation.isPending ? 'Generowanie...' : 'Generuj raport'}
          </button>
        </div>
      </div>
      
      {/* Report Results */}
      {reportData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Wyniki raportu</h2>
            {hasPermission('timeTracking', 'exportReports') && (
              <button
                onClick={exportToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Eksportuj do Excela
              </button>
            )}
          </div>
          
          {/* Summary Table */}
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pracownik
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Całkowity czas pracy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Całkowity czas przerw
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dni robocze
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.map(user => (
                  <tr key={user.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(user.totalWorkDuration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(user.totalBreakDuration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.dailyData.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Detailed Data Accordion */}
          <div className="border border-gray-200 rounded-md divide-y">
            {reportData.map(user => (
              <details key={user.userId} className="group">
                <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-sm text-gray-500">
                    {user.dailyData.length} dni, {formatDuration(user.totalWorkDuration)} przepracowane
                  </span>
                </summary>
                <div className="p-4 bg-gray-50">
                  {user.dailyData.length === 0 ? (
                    <p className="text-center text-gray-500 py-2">Brak danych dla wybranego zakresu dat</p>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Data
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Czas pracy
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Czas przerw
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Sesje
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {user.dailyData.sort((a, b) => new Date(b.date) - new Date(a.date)).map(day => (
                          <tr key={day.date} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {new Date(day.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(day.workDuration)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {formatDuration(day.breakDuration)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                              {day.sessions.length}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeTrackingReportsPage;