import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RoleForm from '../components/forms/RoleForm';
import roleApi from '../api/role.api';

const CreateRolePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const createRoleMutation = useMutation({
    mutationFn: (roleData) => roleApi.create(roleData),
    onSuccess: () => {
      // Invalidate roles query to refresh data
      queryClient.invalidateQueries(['roles']);
      toast.success('Role created successfully');
      navigate('/roles');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error creating role');
    }
  });
  
  const handleSubmit = (data) => {
    createRoleMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Create New Role</h1>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <RoleForm 
            onSubmit={handleSubmit} 
            isLoading={createRoleMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateRolePage;