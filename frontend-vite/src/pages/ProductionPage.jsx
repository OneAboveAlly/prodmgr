import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import productionApi from '../api/production.api';
import PriorityBadge from '../components/production/PriorityBadge';
import StatusBadge from '../components/production/StatusBadge';

const ProductionPage = () => {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState({
    status: '',
    priority: ''
  });
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch production guides based on filters and pagination
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['productionGuides', page, limit, filters],
    queryFn: () => productionApi.getAllProductionGuides({
      page,
      limit,
      ...filters
    }),
    keepPreviousData: true
  });

  // Update the page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters]);

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: '',
      priority: ''
    });
  };

  // Show error if API call fails
  if (isError) {
    toast.error(`Error loading production guides: ${error.message}`);
  }

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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Create New Guide
          </Link>
        )}
      </div>
      
      {/* Filters */}
      <div className="bg-white shadow-md rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
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
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          
          <div className="flex items-end">
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
      
      {/* Table of Production Guides */}
      {!isLoading && (
        <>
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priority
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Deadline
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Author
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data?.guides?.length > 0 ? (
                  data.guides.map((guide) => (
                    <tr key={guide.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <Link to={`/production/guides/${guide.id}`} className="hover:text-indigo-600">
                            {guide.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={guide.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PriorityBadge priority={guide.priority} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guide.deadline ? new Date(guide.deadline).toLocaleDateString() : 'No deadline'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {guide.createdBy?.firstName} {guide.createdBy?.lastName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link to={`/production/guides/${guide.id}`} className="text-indigo-600 hover:text-indigo-900 mr-3">
                          View
                        </Link>
                        {hasPermission('production', 'update') && (
                          <Link to={`/production/guides/${guide.id}/edit`} className="text-green-600 hover:text-green-900">
                            Edit
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                      No production guides found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {data?.pagination && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4">
              <div className="flex-1 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(page * limit, data.pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{data.pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                        page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="sr-only">Previous</span>
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                      {page}
                    </span>
                    <button
                      onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
                      disabled={page >= data.pagination.pages}
                      className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                        page >= data.pagination.pages ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      <span className="sr-only">Next</span>
                      Next
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