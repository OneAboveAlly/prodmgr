// frontend-vite/src/pages/ProductionPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import productionApi from '../api/production.api';
import PriorityBadge from '../components/production/PriorityBadge';
import StatusBadge from '../components/production/StatusBadge';
import ProgressBar from '../components/production/ProgressBar';

const ProductionPage = () => {
  const { hasPermission, user } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    search: '',
    createdBy: ''
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const [showMyGuides, setShowMyGuides] = useState(false);

  // Fetch production guides based on filters and pagination
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['productionGuides', page, limit, filters, showMyGuides],
    queryFn: async () => {
      console.log('Fetching guides with params:', {
        page, limit, filters, showMyGuides,
        userId: user?.id
      });
      
      const result = await productionApi.getAllProductionGuides({
        page,
        limit,
        ...filters,
        createdBy: showMyGuides && user ? user.id : filters.createdBy,
        experimentalDetailFetch: true,
      });
      
      console.log('Guide list data received:', result);
      
      // Manually process guide data to ensure progress bars work correctly
      if (result && result.guides) {
        result.guides = result.guides.map(guide => {
          // Skip if no guide or no steps
          if (!guide || !guide.steps || guide.steps.length === 0) return guide;
          
          // Log for debugging
          console.log(`Processing guide ${guide.id} with ${guide.steps.length} steps`);
          
          // Ensure proper time values for every step
          const processedSteps = guide.steps.map(step => {
            const estimatedTime = Number(step.estimatedTime || 0);
            const actualTime = Number(step.actualTime || 0);
            
            // For completed steps, if no actual time is set, use estimated time
            const processedActualTime = 
              step.status === 'COMPLETED' && actualTime === 0 ? estimatedTime : actualTime;
            
            return {
              ...step,
              estimatedTime,
              actualTime: processedActualTime
            };
          });
          
          // Calculate totals
          const totalEstimatedTime = processedSteps.reduce(
            (sum, step) => sum + Number(step.estimatedTime || 0), 0);
          const totalActualTime = processedSteps.reduce(
            (sum, step) => sum + Number(step.actualTime || 0), 0);
          
          // Assign to guide
          guide.steps = processedSteps;
          
          // Ensure stats object exists
          if (!guide.stats) guide.stats = {};
          if (!guide.stats.time) guide.stats.time = {};
          
          // Force correct stats values to ensure progress bar works
          guide.stats.time.totalEstimatedTime = totalEstimatedTime;
          guide.stats.time.totalActualTime = totalActualTime;
          
          console.log(`Guide ${guide.id} processed: Est=${totalEstimatedTime}, Act=${totalActualTime}`);
          
          return guide;
        });
      }
      
      return result;
    },
    keepPreviousData: true,
    onError: (err) => {
      toast.error(`Błąd wczytywania przewodników: ${err.message}`);
    }
  });

  // Update the page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters, showMyGuides]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setFilters(prev => ({
      ...prev,
      search: e.target.value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: '',
      search: '',
      createdBy: ''
    });
    setShowMyGuides(false);
  };

  // Toggle showing only my guides
  const toggleMyGuides = () => {
    setShowMyGuides(prev => !prev);
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
  };

  const generatePageNumbers = (currentPage, totalPages) => {
    const delta = 2; // Number of pages to show around the current page
    const range = [];
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i);
    }
    if (currentPage - delta > 2) range.unshift('...');
    if (currentPage + delta < totalPages - 1) range.push('...');
    return [1, ...range, totalPages];
  };

  // Check if user doesn't have permission to view
  if (!hasPermission('production', 'read')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Brak dostępu:</strong>
          <span className="block"> Nie masz uprawnień do przeglądania przewodników produkcyjnych.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Przewodniki Produkcyjne</h1>
        
        <div className="flex space-x-3">
          {/* Navigation buttons */}
          <div className="flex space-x-2">
            <Link
              to="/production/archive"
              className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                />
              </svg>
              Archiwum
            </Link>
            
            <Link
              to="/production/templates"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <svg
                className="w-5 h-5 mr-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"
                />
              </svg>
              Szablony
            </Link>
          </div>
          
          {/* Create New Guide button - only shown if user has create permission */}
          {hasPermission('production', 'create') && (
            <Link
              to="/production/new"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Utwórz Nowy Przewodnik
            </Link>
          )}
        </div>
      </div>
      
      {/* Quick Stats */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Wszystkich przewodników</p>
                <p className="text-2xl font-bold">{data.stats.totalGuides || 0}</p>
              </div>
              <svg className="w-10 h-10 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-blue-500 text-sm">W trakcie</p>
                <p className="text-2xl font-bold">{data.stats.inProgress || 0}</p>
              </div>
              <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-green-500 text-sm">Zakończonych</p>
                <p className="text-2xl font-bold">{data.stats.completed || 0}</p>
              </div>
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-red-500 text-sm">Krytycznych</p>
                <p className="text-2xl font-bold">{data.stats.critical || 0}</p>
              </div>
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Szukaj
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Szukaj po tytule, opisie"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Wszystkie statusy</option>
              <option value="DRAFT">Szkic</option>
              <option value="IN_PROGRESS">W trakcie</option>
              <option value="COMPLETED">Zakończony</option>
              <option value="CANCELLED">Anulowany</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priorytet
            </label>
            <select
              id="priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Wszystkie priorytety</option>
              <option value="LOW">Niski</option>
              <option value="NORMAL">Normalny</option>
              <option value="HIGH">Wysoki</option>
              <option value="CRITICAL">Krytyczny</option>
            </select>
          </div>
          
          <div className="flex flex-col justify-end">
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="checkbox"
                id="myGuides"
                checked={showMyGuides}
                onChange={toggleMyGuides}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label htmlFor="myGuides" className="text-sm text-gray-700">
                Pokaż tylko moje przewodniki
              </label>
            </div>
            <button
              onClick={resetFilters}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Resetuj filtry
            </button>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600 text-lg">Ładowanie przewodników produkcyjnych...</div>
        </div>
      )}
      
      {/* Error state */}
      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Błąd:</strong>
          <span className="block">{error.message}</span>
          <button 
            onClick={() => refetch()}
            className="mt-2 bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-3 rounded text-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
      
      {/* Grid of guides */}
      {data && data.guides && data.guides.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.guides.map(guide => (
            <div 
              key={guide.id} 
              className={`bg-white overflow-hidden shadow-md rounded-lg hover:shadow-lg transition-shadow duration-300 flex flex-col
                ${guide.priority === 'CRITICAL' ? 'border-l-4 border-red-500' : 
                 guide.priority === 'HIGH' ? 'border-l-4 border-orange-500' : 
                 guide.priority === 'NORMAL' ? '' :
                 guide.priority === 'LOW' ? 'border-l-4 border-green-500' : ''}
              `}
            >
              <div className="p-5 flex-grow">
                <div className="flex justify-between items-start mb-2">
                  <Link 
                    to={`/production/guides/${guide.id}`}
                    className={`text-base font-bold hover:underline truncate max-w-[200px]
                      ${guide.priority === 'CRITICAL' ? 'text-red-900' : 
                       guide.priority === 'HIGH' ? 'text-orange-900' : 
                       guide.priority === 'NORMAL' ? 'text-blue-900' :
                       guide.priority === 'LOW' ? 'text-green-900' : 'text-gray-900'}
                      ${guide.status === 'COMPLETED' ? 'text-green-800' : ''}
                    `}
                  >
                    {guide.title}
                    {guide.priority === 'CRITICAL' && (
                      <span className="ml-2 text-red-600 animate-pulse">⚠️</span>
                    )}
                    {guide.status === 'COMPLETED' && (
                      <span className="ml-2 text-green-600">✅</span>
                    )}
                  </Link>
                  <PriorityBadge priority={guide.priority} size={guide.priority === 'CRITICAL' || guide.priority === 'HIGH' ? 'large' : 'normal'} />
                </div>
                
                <div className="flex items-center mb-2">
                  <StatusBadge status={guide.status} />
                  <span className="text-xs text-gray-500 ml-2">
                    {formatDate(guide.deadline)}
                  </span>
                  {guide.priority === 'CRITICAL' && (
                    <span className="ml-2 text-xs font-bold text-red-600 border border-red-300 rounded px-1 bg-red-50">
                      Pilne!
                    </span>
                  )}
                </div>

                {guide.description && (
                  <p className="text-gray-700 text-xs mb-3 line-clamp-2">
                    {guide.description}
                  </p>
                )}
                
                {/* Use the ProgressBar component with compact mode for the list view */}
                {guide.steps && guide.steps.length > 0 && (
                  <ProgressBar 
                    guide={guide} 
                    compact={true}
                    autoUpdateStatus={true}
                  />
                )}
                
                <div className="mt-3 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    {guide.createdBy?.firstName} {guide.createdBy?.lastName}
                  </div>
                  
                  <Link 
                    to={`/production/guides/${guide.id}`}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                  >
                    Szczegóły →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg p-8 text-center">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Nie znaleziono przewodników produkcyjnych</h3>
          <p className="text-gray-500 mb-4">
            {Object.values(filters).some(val => val) || showMyGuides
              ? "Żaden przewodnik nie pasuje do wybranych filtrów. Spróbuj zmienić kryteria wyszukiwania."
              : "Nie utworzono jeszcze żadnych przewodników produkcyjnych."}
          </p>
          {hasPermission('production', 'create') && (
            <Link
              to="/production/new"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
            >
              Utwórz pierwszy przewodnik
            </Link>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {data?.pagination && data.pagination.total > 0 && data.pagination.pages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm">
          <div className="flex-1 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-700">
                Pokazano <span className="font-medium">{((page - 1) * limit) + 1}</span> do{' '}
                <span className="font-medium">
                  {Math.min(page * limit, data.pagination.total)}
                </span>{' '}
                z <span className="font-medium">{data.pagination.total}</span> przewodników
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Paginacja">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="sr-only">Poprzednia</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </button>

                {generatePageNumbers(page, data.pagination.pages).map((pageNum, index) => (
                  <button
                    key={index}
                    onClick={() => typeof pageNum === 'number' && setPage(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                      page === pageNum
                        ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                        : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                    }`}
                    disabled={pageNum === '...'}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
                  disabled={page >= data.pagination.pages}
                  className={`relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    page >= data.pagination.pages ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <span className="sr-only">Następna</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l4.5-4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionPage;