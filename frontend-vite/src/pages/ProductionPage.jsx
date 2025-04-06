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
  const [limit] = useState(10);
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
      });
      
      console.log('Guide list data received:', result);
      return result;
    },
    keepPreviousData: true,
    onError: (err) => {
      toast.error(`Error loading guides: ${err.message}`);
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

  // Check if user doesn't have permission to view
  if (!hasPermission('production', 'read')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Access Denied:</strong>
          <span className="block"> You do not have permission to view production guides.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Production Guides</h1>
        
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
            Create New Guide
          </Link>
        )}
      </div>
      
      {/* Quick Stats */}
      {data?.stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-500 text-sm">Total Guides</p>
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
                <p className="text-blue-500 text-sm">In Progress</p>
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
                <p className="text-green-500 text-sm">Completed</p>
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
                <p className="text-red-500 text-sm">Critical</p>
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
              Search
            </label>
            <input
              type="text"
              id="search"
              name="search"
              value={filters.search}
              onChange={handleSearchChange}
              placeholder="Search by title, description"
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
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
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
                Show only my guides
              </label>
            </div>
            <button
              onClick={resetFilters}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="text-gray-600 text-lg">Loading production guides...</div>
        </div>
      )}
      
      {/* Error state */}
      {isError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
          <strong className="font-bold">Error:</strong>
          <span className="block">{error.message}</span>
          <button 
            onClick={() => refetch()}
            className="mt-2 bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-3 rounded text-sm"
          >
            Try Again
          </button>
        </div>
      )}
      
      {/* Guides List - Card View */}
      {!isLoading && !isError && (
        <>
          {data?.guides?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {data.guides.map((guide) => (
                <div 
                  key={guide.id}
                  className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                >
                  <div className="px-6 py-4">
                    <div className="flex justify-between items-start mb-2">
                      <Link 
                        to={`/production/guides/${guide.id}`}
                        className="text-lg font-bold text-gray-900 hover:text-indigo-600"
                      >
                        {guide.title}
                      </Link>
                      <PriorityBadge priority={guide.priority} />
                    </div>
                    
                    <div className="flex items-center mb-2">
                      <StatusBadge status={guide.status} />
                      <span className="text-xs text-gray-500 ml-2">
                        {formatDate(guide.deadline)}
                      </span>
                    </div>
                    
                    {process.env.NODE_ENV === 'development' && (
                      <div className="text-xs text-gray-400 mb-2">
                        ID: {guide.id} | Steps: {guide.steps?.length || 0}
                      </div>
                    )}

                    {guide.description && (
                      <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                        {guide.description}
                      </p>
                    )}
                    
                    {/* Use the ProgressBar component with compact mode for the list view */}
                    {guide.steps && guide.steps.length > 0 && (
                      <ProgressBar 
                        guide={guide} 
                        compact={true} 
                      />
                    )}
                    
                    <div className="mt-4 flex justify-between items-center">
                      <div className="text-xs text-gray-500">
                        Created by: {guide.createdBy?.firstName} {guide.createdBy?.lastName}
                      </div>
                      
                      <Link 
                        to={`/production/guides/${guide.id}`}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        View Details →
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Production Guides Found</h3>
              <p className="text-gray-500 mb-4">
                {Object.values(filters).some(val => val) || showMyGuides
                  ? "No guides match your current filters. Try adjusting your search criteria."
                  : "There are no production guides created yet."}
              </p>
              {hasPermission('production', 'create') && (
                <Link
                  to="/production/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  Create Your First Guide
                </Link>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {data?.pagination && data.pagination.total > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm">
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * limit, data.pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{data.pagination.total}</span> guides
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`relative inline-flex items-center rounded-l-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                        page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, data.pagination.pages) }, (_, i) => {
                      const pageNum = i + 1;
                      // Show first page, last page, and pages around current page
                      if (
                        pageNum === 1 ||
                        pageNum === data.pagination.pages ||
                        (pageNum >= page - 1 && pageNum <= page + 1)
                      ) {
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setPage(pageNum)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                              page === pageNum
                                ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                                : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
                      disabled={page >= data.pagination.pages}
                      className={`relative inline-flex items-center rounded-r-md px-3 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                        page >= data.pagination.pages ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProductionPage;