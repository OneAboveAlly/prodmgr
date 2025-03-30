// frontend/src/pages/LeavePage.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import leaveApi from '../api/leave.api';
import LeaveRequestButton from '../components/leave/LeaveRequestButton';
import { Link } from 'react-router-dom';

const LeavePage = () => {
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({
    status: '',
    from: '',
    to: ''
  });
  
  // Fetch user's leave requests
  const { 
    data, 
    isLoading, 
    isError,
    error
  } = useQuery({
    queryKey: ['userLeaves', page, filter],
    queryFn: () => leaveApi.getUserLeaves(page, 10, filter).then(res => res.data),
  });
  
  // Fetch pending leave requests (for managers/admins)
  const { 
    data: pendingData, 
    isLoading: pendingLoading 
  } = useQuery({
    queryKey: ['pendingLeaves'],
    queryFn: () => leaveApi.getPendingLeaves().then(res => res.data),
    enabled: hasPermission('leave', 'approve')
  });
  
  // Update leave mutation
  const cancelLeaveMutation = useMutation({
    mutationFn: (id) => leaveApi.deleteLeaveRequest(id),
    onSuccess: () => {
      toast.success('Leave request canceled successfully');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['dailySummaries'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to cancel leave request');
    }
  });
  
  // Approve leave mutation
  const approveLeaveMutation = useMutation({
    mutationFn: ({ id, notes }) => leaveApi.approveLeave(id, notes),
    onSuccess: () => {
      toast.success('Leave request approved');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['dailySummaries'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve leave request');
    }
  });
  
  // Reject leave mutation
  const rejectLeaveMutation = useMutation({
    mutationFn: ({ id, notes }) => leaveApi.rejectLeave(id, notes),
    onSuccess: () => {
      toast.success('Leave request rejected');
      queryClient.invalidateQueries({ queryKey: ['userLeaves'] });
      queryClient.invalidateQueries({ queryKey: ['pendingLeaves'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to reject leave request');
    }
  });
  
  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
    setPage(1); // Reset to first page on filter change
  };
  
  // Handle page changes
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Handle leave approval with confirmation
  const handleApproveLeave = (id) => {
    const notes = prompt('Optional: Add notes for this approval');
    approveLeaveMutation.mutate({ id, notes: notes || '' });
  };
  
  // Handle leave rejection with confirmation
  const handleRejectLeave = (id) => {
    const notes = prompt('Please provide a reason for rejection');
    if (notes) {
      rejectLeaveMutation.mutate({ id, notes });
    }
  };
  
  // Handle leave cancellation with confirmation
  const handleCancelLeave = (id) => {
    if (window.confirm('Are you sure you want to cancel this leave request?')) {
      cancelLeaveMutation.mutate(id);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leave Management</h1>
        
        <div className="flex gap-2">
          {hasPermission('leave', 'create') && (
            <LeaveRequestButton />
          )}
          
          {hasPermission('leave', 'manageTypes') && (
            <Link
              to="/leave/types"
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              Manage Leave Types
            </Link>
          )}
        </div>
      </div>
      
      {/* Pending Requests Section (for managers/admins) */}
      {hasPermission('leave', 'approve') && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Pending Approval Requests</h2>
          
          {pendingLoading ? (
            <div className="bg-white p-6 rounded-lg shadow text-center">Loading pending requests...</div>
          ) : pendingData?.leaves?.length === 0 ? (
            <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
              No pending leave requests to approve
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
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
                          {leave.halfDay && ` (Half day${leave.morning ? ' morning' : ' afternoon'})`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {leave.halfDay 
                            ? '0.5 day' 
                            : `${Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days`
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
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave.id)}
                            disabled={rejectLeaveMutation.isPending}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
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
                      Showing {pendingData.leaves.length} of {pendingData.pagination.total} requests
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* My Leave Requests Section */}
      <div>
        <h2 className="text-lg font-semibold mb-3">My Leave Requests</h2>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                name="status"
                value={filter.status}
                onChange={handleFilterChange}
                className="border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              >
                <option value="">All statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                name="from"
                value={filter.from}
                onChange={handleFilterChange}
                className="border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                name="to"
                value={filter.to}
                onChange={handleFilterChange}
                min={filter.from}
                className="border border-gray-300 rounded-md shadow-sm p-2 text-sm"
              />
            </div>
          </div>
        </div>
        
        {/* Leave Requests Table */}
        {isLoading ? (
          <div className="bg-white p-6 rounded-lg shadow text-center">Loading your leave requests...</div>
        ) : isError ? (
          <div className="bg-red-100 p-4 rounded-md text-red-700">
            Error: {error?.message || 'Failed to load leave requests'}
          </div>
        ) : data?.leaves?.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No leave requests found
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data?.leaves?.map(leave => (
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
                        {leave.halfDay && ` (Half day${leave.morning ? ' morning' : ' afternoon'})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {leave.halfDay 
                          ? '0.5 day' 
                          : `${Math.ceil((new Date(leave.endDate) - new Date(leave.startDate)) / (1000 * 60 * 60 * 24)) + 1} days`
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            leave.status === 'pending' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : leave.status === 'approved'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {leave.status.charAt(0).toUpperCase() + leave.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {leave.notes || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {leave.status === 'pending' && (
                          <button
                            onClick={() => handleCancelLeave(leave.id)}
                            disabled={cancelLeaveMutation.isPending}
                            className="text-red-600 hover:text-red-900"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {data?.pagination && data.pagination.pages > 1 && (
              <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="flex-1 flex justify-between">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      page === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <span className="text-sm text-gray-700">
                    Page {page} of {data.pagination.pages}
                  </span>
                  
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === data.pagination.pages}
                    className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                      page === data.pagination.pages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LeavePage;