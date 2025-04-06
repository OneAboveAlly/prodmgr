// frontend-vite/src/pages/ArchivedGuidesPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import MainLayout from '../components/layout/MainLayout';
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
  
  // Fetch archived guides
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

  // Unarchive guide function
  const handleUnarchive = async (guideId) => {
    try {
      await productionApi.unarchiveGuide(guideId);
      toast.success("Guide unarchived successfully");
      refetch();
    } catch (err) {
      toast.error(`Error unarchiving guide: ${err.message}`);
    }
  };
  
  // Format date helper function
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Archived Production Guides</h1>
          <Link
            to="/production"
            className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Active Guides
          </Link>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="flex max-w-md">
            <input
              type="text"
              placeholder="Search archived guides..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-l shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button 
              onClick={() => refetch()} 
              className="bg-indigo-600 text-white px-4 py-2 rounded-r hover:bg-indigo-700"
            >
              Search
            </button>
          </div>
        </div>

        {/* Loading state */}
        {isLoading && <div className="text-center py-6">Loading archived guides...</div>}

        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
            <p>Error loading archived guides: {error?.message}</p>
            <button onClick={() => refetch()} className="underline">Try again</button>
          </div>
        )}

        {/* Guides table */}
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
                      Title
                      {sortBy === 'title' && (
                        <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortChange('deadline')}
                    >
                      Deadline
                      {sortBy === 'deadline' && (
                        <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                    <th 
                      scope="col" 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSortChange('archivedAt')}
                    >
                      Archived Date
                      {sortBy === 'archivedAt' && (
                        <span>{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>
                      )}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.guides?.length > 0 ? (
                    data.guides.map((guide) => (
                      <tr key={guide.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{guide.title}</div>
                          {guide.barcode && <div className="text-sm text-gray-500">Barcode: {guide.barcode}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={guide.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <PriorityBadge priority={guide.priority} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{guide.deadline ? formatDate(guide.deadline) : 'No deadline'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">{guide.archivedAt ? formatDate(guide.archivedAt) : '-'}</div>
                          {guide.archivedBy && <div className="text-xs text-gray-400">by {guide.archivedBy.firstName} {guide.archivedBy.lastName}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => navigate(`/production/guides/${guide.id}`)}
                            className="text-indigo-600 hover:text-indigo-900 mr-3"
                          >
                            View
                          </button>
                          {hasPermission('production', 'update') && (
                            <button
                              onClick={() => handleUnarchive(guide.id)}
                              className="text-green-600 hover:text-green-900"
                            >
                              Unarchive
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No archived guides found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Simple Pagination */}
            {data?.pagination && (
              <div className="flex justify-center mt-6">
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                    Page {currentPage} of {data.pagination.totalPages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(Math.min(data.pagination.totalPages, currentPage + 1))}
                    disabled={currentPage === data.pagination.totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default ArchivedGuidesPage;