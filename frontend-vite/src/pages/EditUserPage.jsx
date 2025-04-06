import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import UserForm from '../components/forms/UserForm';
import userApi from '../api/user.api';

const EditUserPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch user data with improved error handling
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      try {
        console.log('Fetching user with ID:', id);
        const response = await userApi.getById(id);
        
        // Handle different response formats
        const userData = response.data || response;
        
        if (!userData || (typeof userData === 'object' && Object.keys(userData).length === 0)) {
          throw new Error('User data not found');
        }
        
        console.log('User data received:', userData);
        return userData;
      } catch (err) {
        console.error('Error fetching user:', err);
        throw err;
      }
    },
    retry: 1,
    refetchOnWindowFocus: false
  });
  
  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: (userData) => userApi.update(id, userData),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      navigate('/users');
    },
    onError: (error) => {
      console.error('Update error details:', error);
      const errorMessage = 
        error.response?.data?.message || 
        error.message || 
        'Error updating user';
      toast.error(errorMessage);
    }
  });
  
  const handleSubmit = (formData) => {
    updateUserMutation.mutate(formData);
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading user data...</div>
        </div>
      </div>
    );
  }
  
  // Show error state with more detailed error info and back button
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error.response?.data?.message || error.message || 'Error loading user'}</span>
          <p className="mt-2 text-sm">Please check that the user ID is valid and the API is configured correctly.</p>
        </div>
        <button 
          onClick={() => navigate('/users')}
          className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
        >
          Back to Users List
        </button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Edit User: {data.firstName} {data.lastName}
          </h1>
          <Link 
            to="/users"
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Back to Users List
          </Link>
        </div>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <UserForm 
            user={data}
            onSubmit={handleSubmit}
            isLoading={updateUserMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default EditUserPage;