// frontend/src/pages/ActiveUsersPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ActiveUsersTracker from '../components/timeTracking/ActiveUsersTracker';

const ActiveUsersPage = () => {
  const { hasPermission } = useAuth();
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'active', 'inactive'
    dateFrom: '',
    dateTo: '',
    searchTerm: ''
  });
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      status: 'all',
      dateFrom: '',
      dateTo: '',
      searchTerm: ''
    });
  };
  
  // If the user doesn't have the required permission, show a message
  if (!hasPermission('timeTracking', 'viewAll')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Access Denied:</strong>
          <span className="block"> You do not have permission to view all users' activity.</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Activity Monitor</h1>
        <div className="flex space-x-2">
          <Link 
            to="/time-tracking/reports"
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            View Reports
          </Link>
          <Link 
            to="/time-tracking"
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Time Tracking
          </Link>
        </div>
      </div>
      
      {/* Filter Panel */}
      <div className="mb-6 bg-white rounded-lg shadow-md p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select 
              name="status" 
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="all">All</option>
              <option value="active">Working</option>
              <option value="inactive">Not Working</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <input 
              type="date" 
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <input 
              type="date" 
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div className="flex-1 min-w-[250px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Users</label>
            <input 
              type="text" 
              name="searchTerm"
              value={filters.searchTerm}
              onChange={handleFilterChange}
              placeholder="Name, email or login"
              className="w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          
          <div>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>
      
      {/* Active Users Tracker */}
      <ActiveUsersTracker filters={filters} />
      
      {/* Debug Information */}
      <div className="mt-6 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-semibold mb-4">Troubleshooting Information</h2>
        <p className="text-gray-600 mb-4">
          This panel is designed to help administrators diagnose issues with time tracking data visibility. 
          It shows real-time activity status of all users and their recent sessions.
        </p>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Troubleshooting Tips</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  <li>Ensure time tracking sessions are properly ended by users</li>
                  <li>Check that date filters in reports include the relevant time period</li>
                  <li>Verify that the correct users are selected when generating reports</li>
                  <li>If data is missing, try clearing browser cache and cookies</li>
                  <li>For database issues, contact your system administrator</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActiveUsersPage;