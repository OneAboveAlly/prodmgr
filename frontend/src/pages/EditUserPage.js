import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import UserForm from '../components/forms/UserForm';
import userApi from '../api/user.api';

const EditUserPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch user data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userApi.getById(id).then(res => res.data),
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
      toast.error(error.response?.data?.message || 'Error updating user');
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
  
  // Show error state
  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error.response?.data?.message || 'Error loading user'}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Edit User: {data.firstName} {data.lastName}
        </h1>
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