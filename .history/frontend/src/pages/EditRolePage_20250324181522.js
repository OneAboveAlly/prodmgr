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
  const { loading, hasPermission } = useAuth();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [formData, setFormData] = useState(null);

  // ⛔ NIE robimy warunkowo hooków – hooki idą ZAWSZE na górze
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['role', id],
    queryFn: () => roleApi.getById(id).then(res => res.data),
    enabled: !loading // ✅ dopiero odpala query, gdy loading === false
  });

  const updateRoleMutation = useMutation({
    mutationFn: (roleData) => roleApi.update(id, roleData),
    onSuccess: () => {
      toast.success('Role updated successfully');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.invalidateQueries({ queryKey: ['role', id] });
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

  const canEditRoles = hasPermission('roles', 'update');
  const canDeleteRoles = hasPermission('roles', 'delete');

  useEffect(() => {
    if (!loading && !canEditRoles) {
      toast.error('You do not have permission to edit roles');
      navigate('/roles');
    }
  }, [loading, canEditRoles, navigate]);

  if (loading || isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  const handleSubmit = (formData) => {
    if (
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

  const handleFormChange = () => {};

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
