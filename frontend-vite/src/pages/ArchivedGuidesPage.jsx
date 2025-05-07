// frontend-vite/src/pages/ArchivedGuidesPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import productionApi from '../api/production.api';
import PriorityBadge from '../components/production/PriorityBadge';
import StatusBadge from '../components/production/StatusBadge';
import { useAuth } from '../contexts/AuthContext';

const ArchivedGuidesPage = () => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('archivedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  
  // Pobierz zarchiwizowane przewodniki
  const { 
    data, 
    isLoading, 
    isError, 
    error, 
    refetch 
  } = useQuery({
    queryKey: ['archivedGuides', searchTerm, currentPage, sortBy, sortOrder],
    queryFn: () => productionApi.getArchivedGuides({
      search: searchTerm,
      page: currentPage,
      sortBy,
      sortOrder
    }),
    keepPreviousData: true
  });

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Funkcja przywracania przewodnika z archiwum
  const handleUnarchive = async (guideId) => {
    try {
      await productionApi.unarchiveGuide(guideId);
      toast.success("Przewodnik został pomyślnie przywrócony z archiwum");
      refetch();
    } catch (err) {
      toast.error(`Błąd podczas przywracania przewodnika: ${err.message}`);
    }
  };
  
  // Funkcja pomocnicza formatowania daty
  const formatDate = (dateString) => {
    if (!dateString) return 'Brak daty';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Zarchiwizowane Przewodniki Produkcyjne</h1>
        <Link
          to="/production"
          className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Powrót do aktywnych przewodników
        </Link>
      </div>

      {/* Pasek wyszukiwania */}
      <div className="mb-6">
        <div className="flex max-w-md">
          <input
            type="text"
            placeholder="Szukaj w zarchiwizowanych przewodnikach..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-l shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          <button 
            onClick={() => refetch()} 
            className="bg-indigo-600 text-white px-4 py-2 rounded-r hover:bg-indigo-700"
          >
            Szukaj
          </button>
        </div>
      </div>

      {/* Stan ładowania */}
      {isLoading && <div className="text-center py-6">Ładowanie zarchiwizowanych przewodników...</div>}

      {/* Stan błędu */}
      {isError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p>Błąd podczas ładowania zarchiwizowanych przewodników: {error?.message}</p>
          <button onClick={() => refetch()} className="underline">Spróbuj ponownie</button>
        </div>
      )}

      {/* Tabela przewodników */}
      {!isLoading && !isError && (
        <>
          <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg mb-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('title')}
                  >
                    Tytuł
                    {sortBy === 'title' && (
                      <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorytet</th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('deadline')}
                  >
                    Termin
                    {sortBy === 'deadline' && (
                      <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th 
                    scope="col" 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('archivedAt')}
                  >
                    Data archiwizacji
                    {sortBy === 'archivedAt' && (
                      <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                    )}
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Akcje</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.guides?.length > 0 ? (
                  data.guides.map((guide) => (
                    <tr key={guide.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{guide.title}</div>
                        {guide.barcode && <div className="text-sm text-gray-500">Kod kreskowy: {guide.barcode}</div>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={guide.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PriorityBadge priority={guide.priority} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{guide.deadline ? formatDate(guide.deadline) : 'Brak terminu'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{guide.archivedAt ? formatDate(guide.archivedAt) : '-'}</div>
                        {guide.archivedBy && <div className="text-xs text-gray-400">przez {guide.archivedBy.firstName} {guide.archivedBy.lastName}</div>}
                        {guide.archiveReason && (
                          <div className="text-xs italic mt-1 text-gray-500">
                            <span className="font-medium">Powód:</span> {guide.archiveReason}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => navigate(`/production/guides/${guide.id}`, { state: { from: 'archive' } })}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                        >
                          Podgląd
                        </button>
                        {hasPermission('production', 'update') && (
                          <button
                            onClick={() => handleUnarchive(guide.id)}
                            className="text-green-600 hover:text-green-900 mr-3"
                          >
                            Przywróć
                          </button>
                        )}
                        {hasPermission('production', 'create') && (
                          <button
                            onClick={() => {
                              const templateName = window.prompt('Wprowadź nazwę dla tego szablonu:', `${guide.title} Szablon`);
                              if (templateName) {
                                toast.info('Zapisywanie przewodnika jako szablon...');
                                productionApi.saveGuideAsTemplate(guide.id, { 
                                  title: templateName,
                                  description: `Szablon utworzony z zarchiwizowanego przewodnika: ${guide.title}`
                                })
                                  .then((response) => {
                                    console.log('Utworzono szablon:', response);
                                    toast.success('Zarchiwizowany przewodnik został zapisany jako szablon');
                                  })
                                  .catch(err => {
                                    console.error('Błąd tworzenia szablonu:', err);
                                    const errorMessage = 
                                      err.response?.data?.message || 
                                      err.message || 
                                      'Nieznany błąd';
                                    toast.error(`Błąd podczas tworzenia szablonu: ${errorMessage}`);
                                  });
                              }
                            }}
                            className="text-teal-600 hover:text-teal-900"
                            title="Zapisz jako szablon"
                          >
                            Szablon
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                      Nie znaleziono zarchiwizowanych przewodników.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Prosta paginacja */}
          {data?.pagination && (
            <div className="flex justify-center mt-6">
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Paginacja">
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Poprzednia</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Wyświetl numery stron */}
                {Array.from({ length: data.pagination.pages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${
                      currentPage === page 
                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(Math.min(data.pagination.pages, currentPage + 1))}
                  disabled={currentPage === data.pagination.pages || data.pagination.pages === 0}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === data.pagination.pages || data.pagination.pages === 0
                      ? 'text-gray-300 cursor-not-allowed' 
                      : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Następna</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          )}
          
          {/* Informacja o wynikach */}
          {data?.pagination && (
            <div className="text-sm text-gray-500 text-center mt-4">
              Pokazano {data.pagination.total === 0 ? 0 : (currentPage - 1) * data.pagination.limit + 1} do{' '}
              {Math.min(currentPage * data.pagination.limit, data.pagination.total)} z {data.pagination.total} zarchiwizowanych przewodników
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ArchivedGuidesPage;