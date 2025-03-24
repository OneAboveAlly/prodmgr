import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RoleForm from '../components/forms/RoleForm';
import roleApi from '../api/role.api';

const EditRolePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [formChanged, setFormChanged] = useState(false);
  
  // Validate ID parameter
  useEffect(() => {
    if (!id || !/^[0-9a-fA-F-]+$/.test(id)) {
      toast.error('Invalid role ID');
      navigate('/roles');
      return;
    }
  }, [id, navigate]);

  // Fetch role data
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['role', id],
    queryFn: () => roleApi.getById(id).then(res => res.data),
    onError: (err) => {
      if (err.response?.status === 404) {
        toast.error('Role not found');
        navigate('/roles');
      }
    }
  });
  
  // Handle unsaved changes
  useEffect(() => {
    // Function to run before the user navigates away
    const handleBeforeUnload = (e) => {
      if (formChanged) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formChanged]);

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: (roleData) => roleApi.update(id, roleData),
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', id] });
      setFormChanged(false);
      navigate('/roles');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Error updating role');
    }
  });
  
  const handleSubmit = (formData) => {
    updateRoleMutation.mutate(formData);
  };

  const handleFormChange = () => {
    setFormChanged(true);
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
          <div className="mt-4">
            <button 
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
              onClick={() => navigate('/roles')}
            >
              Back to Roles
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">
            Edit Role: {data.name}
          </h1>
          <button 
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => {
              if (formChanged && !window.confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
                return;
              }
              navigate('/roles');
            }}
          >
            Back
          </button>
        </div>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <RoleForm 
            role={data}
            onSubmit={handleSubmit}
            isLoading={updateRoleMutation.isPending}
            onChange={handleFormChange}
          />
        </div>
      </div>
    </div>
  );
};

export default EditRolePage;