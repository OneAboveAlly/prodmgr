// src/pages/EditRolePage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RoleForm from '../components/forms/RoleForm';
import roleApi from '../api/role.api';
import { useAuth } from '../contexts/AuthContext';

const EditRolePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [formData, setFormData] = useState(null);
  const [formChanged, setFormChanged] = useState(false);

  // Safely check permissions - handle case where hasPermission might be undefined
  const canEditRoles = hasPermission ? hasPermission('roles', 'update') : false;
  const canDeleteRoles = hasPermission ? hasPermission('roles', 'delete') : false;

  useEffect(() => {
    if (canEditRoles === false) {
      toast.error('You do not have permission to edit roles');
      navigate('/roles');
    }
  }, [canEditRoles, navigate]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['role', id],
    queryFn: () => roleApi.getById(id).then(res => res.data),
    onError: (error) => {
      const errorMsg = error.response?.status === 404
        ? 'Role not found'
        : error.response?.data?.message || 'Error loading role details';
      toast.error(errorMsg);
    }
  });

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
      const errorMsg = error.response?.data?.message || 'Error updating role';
      toast.error(errorMsg);
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: () => roleApi.delete(id),
    onSuccess: () => {
      toast.success('Role deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      navigate('/roles');
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.message || 'Error deleting role';
      toast.error(errorMsg);
    }
  });

  const handleSubmit = (formData) => {
    // Prevent submission if no changes were made
    if (
      data && 
      JSON.stringify(formData.permissions) === JSON.stringify(data.permissions) &&
      formData.name === data.name &&
      formData.description === data.description
    ) {
      toast.info('No changes detected');
      navigate('/roles');
      return;
    }
    
    setFormData(formData);
    setShowConfirmation(true);
  };

  const handleFormChange = (changed) => setFormChanged(changed);

  if (isLoading) return (
    <div className="flex justify-center items-center h-64">
      <div className="text-lg">Loading role details...</div>
    </div>
  );
  
  if (isError) return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline"> {error?.message || 'Failed to load role'}</span>
      </div>
      <div className="mt-4">
        <Link to="/roles" className="text-blue-600 hover:text-blue-800">Back to Roles</Link>
      </div>
    </div>
  );
  
  if (!data) return null;

  return (
    <div className="container mx-auto px-4 py-8">
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">Dashboard</Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2">/</span>
              <Link to="/roles" className="text-gray-700 hover:text-blue-600">Roles</Link>
            </div>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-2">/</span>
              <span className="text-gray-500">Edit: {data.name}</span>
            </div>
          </li>
        </ol>
      </nav>

      <div className="max-w-3xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold">Edit Role: {data.name}</h1>
          {canDeleteRoles && (
            <button
              onClick={() => setShowDeleteConfirmation(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
            >
              Delete Role
            </button>
          )}
        </div>

        <RoleForm
          role={data}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          isLoading={updateRoleMutation.isPending}
        />
      </div>

      {showConfirmation && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-2">Confirm Update</h2>
            <p>Are you sure you want to update this role?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  updateRoleMutation.mutate(formData);
                  setShowConfirmation(false);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >Update</button>
              <button
                onClick={() => setShowConfirmation(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded shadow-lg">
            <h2 className="text-lg font-bold mb-2">Confirm Delete</h2>
            <p>Are you sure you want to delete this role?</p>
            <div className="mt-4 flex justify-end space-x-2">
              <button
                onClick={() => {
                  deleteRoleMutation.mutate();
                  setShowDeleteConfirmation(false);
                }}
                className="bg-red-600 text-white px-4 py-2 rounded"
              >Delete</button>
              <button
                onClick={() => setShowDeleteConfirmation(false)}
                className="bg-gray-300 px-4 py-2 rounded"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRolePage;
