import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RoleForm from '../components/forms/RoleForm';
import roleApi from '../api/role.api';

const EditRolePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Fetch role data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['role', id],
    queryFn: () => roleApi.getById(id).then(res => res.data),
  });
  
  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: (roleData) => roleApi.update(id, roleData),
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      navigate('/roles');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error updating role');
    }
  });
  
  const handleSubmit = (formData) => {
    updateRoleMutation.mutate(formData);
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">Loading role data...</div>
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
          <span className="block sm:inline"> {error.response?.data?.message || 'Error loading role'}</span>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Edit Role: {data.name}
        </h1>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <RoleForm 
            role={data}
            onSubmit={handleSubmit}
            isLoading={updateRoleMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default EditRolePage;