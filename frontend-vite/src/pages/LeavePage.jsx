// frontend/src/pages/LeavePage.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import leaveApi from '../api/leave.api';
import LeaveRequestButton from '../components/leave/LeaveRequestButton';
import { Link } from 'react-router-dom';

// Helper function to match status regardless of case
const caseInsensitiveStatusMatch = (status, expectedStatus) => {
  if (!status) return false;
  return status.toLowerCase() === expectedStatus.toLowerCase();
};

const LeavePage = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({
    status: '',
    from: '',
    to: ''
  });
  
  // Pobieranie wniosków urlopowych użytkownika
  const { 
    data, 
    isLoading, 
    isError,
    error
  } = useQuery({
    queryKey: ['userLeaves', page, filter],
    queryFn: () => leaveApi.getUserLeaves(page, 10, filter).then(res => res.data),
  });
  
  // Pobieranie oczekujących wniosków urlopowych (dla managerów/adminów)
  const { 
    data: pendingData, 
    isLoading: pendingLoading 
  } = useQuery({
    queryKey: ['pendingLeaves'],
    queryFn: () => leaveApi.getPendingLeaves().then(res => res.data),
    enabled: hasPermission('leave', 'approve')
  });
  
  // Mutacja anulowania urlopu
  const cancelLeaveMutation = useMutation({
    mutationFn: (id) => leaveApi.deleteLeaveRequest(id),
    onSuccess: () => {
      toast.success('Wniosek urlopowy został pomyślnie anulowany');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['dailySummaries'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się anulować wniosku urlopowego');
    }
  });
  
  // Mutacja zatwierdzania urlopu
  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, notes }) => leaveApi.approveLeave(id, notes),
    onSuccess: () => {
      toast.success('Wniosek urlopowy został zatwierdzony');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['dailySummaries'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się zatwierdzić wniosku urlopowego');
    }
  });
  
  // Mutacja odrzucania urlopu
  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, notes }) => leaveApi.rejectLeave(id, notes),
    onSuccess: () => {
      toast.success('Wniosek urlopowy został odrzucony');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Nie udało się odrzucić wniosku urlopowego');
    }
  });
  
  // Obsługa zmian filtrów
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Resetuj do pierwszej strony przy zmianie filtra
  };
  
  // Obsługa zmiany strony
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Obsługa zatwierdzania wniosku urlopowego z potwierdzeniem
  const handleApproveLeave = (id) => {
    // Use confirm dialogue first to avoid accidental approvals
    if (window.confirm('Czy na pewno chcesz zatwierdzić ten wniosek urlopowy?')) {
      const notes = prompt('Opcjonalnie: Dodaj notatki do tego zatwierdzenia (lub kliknij Anuluj/Cancel, aby zatwierdzić bez notatek)');
      
      // Handle approval
      approveLeaveMutation.mutate(
        { id, notes: notes || '' },
        {
          onError: (error) => {
            console.error('Error details:', error);
            const errorMessage = error.response?.data?.message || 'Nie udało się zatwierdzić wniosku urlopowego';
            toast.error(errorMessage);
          }
        }
      );
    }
  };
  
  // Obsługa odrzucania wniosku urlopowego z potwierdzeniem
  const handleRejectLeave = (id) => {
    if (window.confirm('Czy na pewno chcesz odrzucić ten wniosek urlopowy?')) {
      const notes = prompt('Podaj powód odrzucenia wniosku');
      if (notes) {
        rejectLeaveMutation.mutate(
          { id, notes },
          {
            onError: (error) => {
              console.error('Error details:', error);
              const errorMessage = error.response?.data?.message || 'Nie udało się odrzucić wniosku urlopowego';
              toast.error(errorMessage);
            }
          }
        );
      } else {
        toast.warning('Powód odrzucenia jest wymagany');
      }
    }
  };
  
  // Obsługa anulowania wniosku urlopowego z potwierdzeniem
  const handleCancelLeave = (id) => {
    if (window.confirm('Czy na pewno chcesz anulować ten wniosek urlopowy?')) {
      cancelLeaveMutation.mutate(id);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zarządzanie urlopami</h1>
        
        <div className="flex gap-2">
          {hasPermission('leave', 'create') && (
            <LeaveRequestButton />
          )}
          
          {hasPermission('leave', 'manageTypes') && (
            <Link
              to="/leave/types"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Zarządzaj typami urlopów
            </Link>
          )}
        </div>
      </div>
      
      {/* Sekcja oczekujących wniosków (dla managerów/adminów) */}
      {hasPermission('leave', 'approve') && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Wnioski oczekujące na zatwierdzenie</h2>
          
          {pendingLoading ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">Ładowanie oczekujących wniosków...</div>
          ) : pendingData?.leaves?.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              Brak oczekujących wniosków urlopowych do zatwierdzenia
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Pracownik
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Okres
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Czas trwania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notatki
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pendingData?.leaves?.map(leave => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {leave.user.firstName} {leave.user.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                            style={{ 
                              backgroundColor: `${leave.leaveType.color}20`,
                              color: leave.leaveType.color
                            }}
                          >
                            {leave.leaveType.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          {leave.halfDay && ` (Pół dnia${leave.morning ? ' rano' : ' popołudnie'})`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {leave.halfDay 
                            ? '0.5 dnia' 
                            : `${Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} dni`
                          }
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {leave.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => handleApproveLeave(leave.id)}
                            disabled={approveLeaveMutation.isPending}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Zatwierdź
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave.id)}
                            disabled={rejectLeaveMutation.isPending}
                            className="text-red-600 hover:text-red-900"
                          >
                            Odrzuć
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {pendingData?.pagination?.pages > 1 && (
                <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm text-gray-700">
                      Pokazano {pendingData.leaves.length} z {pendingData.pagination.total} wniosków
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Sekcja moich wniosków urlopowych */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Moje wnioski urlopowe</h2>
        
        {/* Filtry */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex flex-wrap gap-4">
            {/* Status filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Wszystkie statusy</option>
                <option value="pending">Oczekujące</option>
                <option value="approved">Zatwierdzone</option>
                <option value="rejected">Odrzucone</option>
              </select>
            </div>
            
            {/* Date range filters */}
            <div>
              <label htmlFor="from" className="block text-sm font-medium text-gray-700 mb-1">
                Od daty
              </label>
              <input
                type="date"
                id="from"
                name="from"
                value={filter.from}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label htmlFor="to" className="block text-sm font-medium text-gray-700 mb-1">
                Do daty
              </label>
              <input
                type="date"
                id="to"
                name="to"
                value={filter.to}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {/* Reset filters button */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilter({ status: '', from: '', to: '' });
                  setPage(1);
                }}
                className="h-10 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Resetuj filtry
              </button>
            </div>
          </div>
        </div>
        
        {/* Data display */}
        {isLoading ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">Ładowanie wniosków urlopowych...</div>
        ) : isError ? (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <p>Błąd podczas ładowania wniosków urlopowych: {error?.message}</p>
          </div>
        ) : data?.leaves?.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            Nie znaleziono wniosków urlopowych.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Typ
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Okres
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Czas trwania
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notatki
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Akcje
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.leaves.map(leave => (
                      <tr key={leave.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span 
                            className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                            style={{ 
                              backgroundColor: `${leave.leaveType.color}20`,
                              color: leave.leaveType.color
                            }}
                          >
                            {leave.leaveType.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                          {leave.halfDay && ` (Pół dnia${leave.morning ? ' rano' : ' popołudnie'})`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {leave.halfDay 
                            ? '0.5 dnia' 
                            : `${Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} dni`
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            caseInsensitiveStatusMatch(leave.status, 'pending') 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : caseInsensitiveStatusMatch(leave.status, 'approved') 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                          }`}>
                            {caseInsensitiveStatusMatch(leave.status, 'pending') ? 'Oczekujący' : 
                             caseInsensitiveStatusMatch(leave.status, 'approved') ? 'Zatwierdzony' : 
                             'Odrzucony'}
                          </span>
                          {leave.actionNotes && (
                            <div className="text-xs mt-1 text-gray-500">
                              {caseInsensitiveStatusMatch(leave.status, 'approved') ? 'Notatka zatwierdzenia: ' : 'Powód odrzucenia: '}
                              {leave.actionNotes}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                          {leave.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {caseInsensitiveStatusMatch(leave.status, 'pending') && (
                            <button
                              onClick={() => handleCancelLeave(leave.id)}
                              disabled={cancelLeaveMutation.isPending}
                              className="text-red-600 hover:text-red-900"
                            >
                              Anuluj
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {data.pagination.pages > 1 && (
                <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => handlePageChange(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          page === 1 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Poprzednia
                      </button>
                      <button
                        onClick={() => handlePageChange(Math.min(data.pagination.pages, page + 1))}
                        disabled={page === data.pagination.pages}
                        className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                          page === data.pagination.pages 
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        Następna
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700">
                          Pokazano <span className="font-medium">{(page - 1) * 10 + 1}</span> do{' '}
                          <span className="font-medium">
                            {Math.min(page * 10, data.pagination.total)}
                          </span>{' '}
                          z <span className="font-medium">{data.pagination.total}</span> wniosków
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                          <button
                            onClick={() => handlePageChange(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                          >
                            <span className="sr-only">Poprzednia</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                          
                          {/* Page Number Buttons */}
                          {Array.from({ length: data.pagination.pages }, (_, i) => i + 1)
                            .filter(pageNum => 
                              pageNum === 1 || 
                              pageNum === data.pagination.pages || 
                              (pageNum >= page - 1 && pageNum <= page + 1)
                            )
                            .map((pageNum, i, filteredPages) => (
                              <React.Fragment key={pageNum}>
                                {i > 0 && filteredPages[i - 1] !== pageNum - 1 && (
                                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                    ...
                                  </span>
                                )}
                                <button
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`relative inline-flex items-center px-4 py-2 border ${
                                    page === pageNum
                                      ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                  } text-sm font-medium`}
                                >
                                  {pageNum}
                                </button>
                              </React.Fragment>
                            ))
                          }
                          
                          <button
                            onClick={() => handlePageChange(Math.min(data.pagination.pages, page + 1))}
                            disabled={page === data.pagination.pages}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                          >
                            <span className="sr-only">Następna</span>
                            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default LeavePage;