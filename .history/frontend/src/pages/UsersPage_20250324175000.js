import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import userApi from '../api/user.api';

const UsersPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Fetch users with pagination
  const { 
    data, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['users', page, limit],
    queryFn: () => userApi.getAll(page, limit)

  });

  console.log('DATA FROM API:', data);
  
  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId) => userApi.delete(userId),
    onSuccess: () => {
      toast.success('User deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error deleting user');
    }
  });
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setPage(newPage);
  };
  
  // Handle user deletion with confirmation
  const handleDeleteUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to delete user ${userName}?`)) {
      deleteUserMutation.mutate(userId);
    }
  };
  
  // Handle add new user
  const handleAddUser = () => {
    navigate('/users/new');
  };
  
  // Handle edit user
  const handleEditUser = (userId) => {
    navigate(`/users/edit/${userId}`);
  };
  
  // If loading
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">Loading users...</div>
      </div>
    );
  }
  
  // If error
  if (isError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error.response?.data?.message || 'Error loading users'}</span>
      </div>
    );
  }

  // If no data or empty array
  if (!data || !Array.isArray(data.users) || data.users.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Users</h1>
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={handleAddUser}
          >
            Add New User
          </button>
        </div>
        
        <div className="bg-white shadow-md rounded p-6 text-center text-gray-500">
          No users found. Click "Add New User" to create one.
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <button 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          onClick={handleAddUser}
        >
          Add New User
        </button>
      </div>
      
      {/* Users Table */}
      <div className="overflow-x-auto bg-white shadow-md rounded">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Login</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
          {Array.isArray(data?.users) && data.users.map(user => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.login}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span 
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {user.roles?.map(role => 
                      <span key={role.id} className="mr-1 px-2 py-1 bg-gray-200 rounded text-xs">
                        {role.name}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => handleEditUser(user.id)}
                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(user.id, `${user.firstName} ${user.lastName}`)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            
            {data?.users.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500">
            Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, data.pagination.total)} of {data.pagination.total} users
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className={`px-3 py-1 rounded ${
                page === 1 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>
            
            {[...Array(data.pagination.pages).keys()].map(i => (
              <button
                key={i}
                onClick={() => handlePageChange(i + 1)}
                className={`px-3 py-1 rounded ${
                  page === i + 1 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {i + 1}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === data.pagination.pages}
              className={`px-3 py-1 rounded ${
                page === data.pagination.pages 
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;