import React, { useState, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import RoleForm from '../components/forms/RoleForm';
import roleApi from '../api/role.api';
import { AuthContext } from '../contexts/AuthContext';

const EditRolePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { hasPermission } = useContext(AuthContext);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState(null);
  
  // Check if user has permission to edit roles
  const canEditRoles = hasPermission('roles', 'update');
  
  // Redirect if user doesn't have permission
  React.useEffect(() => {
    if (canEditRoles === false) {
      toast.error('You do not have permission to edit roles');
      navigate('/roles');
    }
  }, [canEditRoles, navigate]);
  
  // Fetch role data
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
      const errorMsg = error.response?.data?.message || 'Error updating role';
      if (error.response?.status === 400) {
        toast.error(`Validation error: ${errorMsg}`);
      } else if (error.response?.status === 403) {
        toast.error('You do not have permission to update this role');
      } else {
        toast.error(`Failed to update role: ${errorMsg}`);
      }
    }
  });
  
  const handleSubmit = (formData) => {
    // Check if there are actual changes before saving
    if (JSON.stringify(formData.permissions) === JSON.stringify(data.permissions) &&
        formData.name === data.name && 
        formData.description === data.description) {
      toast.info('No changes detected');
      navigate('/roles');
      return;
    }
    
    // Store form data and show confirmation dialog
    setFormData(formData);
    setShowConfirmation(true);
  };
  
  const confirmUpdate = () => {
    setShowConfirmation(false);
    updateRoleMutation.mutate(formData);
  };
  
  const cancelUpdate = () => {
    setShowConfirmation(false);
    setFormData(null);
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-pulse flex space-x-4">
            <div className="rounded-full bg-gray-300 h-12 w-12"></div>
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-300 rounded"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
              </div>
            </div>
          </div>
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
          <div className="mt-2">
            <button 
              onClick={() => navigate('/roles')}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
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
      {/* Breadcrumbs */}
      <nav className="mb-4 flex" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link to="/dashboard" className="text-gray-700 hover:text-blue-600">
              Dashboard
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <Link to="/roles" className="ml-1 text-gray-700 hover:text-blue-600 md:ml-2">
                Roles
              </Link>
            </div>
          </li>
          <li aria-current="page">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"></path>
              </svg>
              <span className="ml-1 text-gray-500 md:ml-2">Edit: {data.name}</span>
            </div>
          </li>
        </ol>
      </nav>
      
      <div className="max-w-3xl mx-auto">
        {/* Status bar for update in progress */}
        {updateRoleMutation.isPending && (
          <div className="mb-4 bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4" role="alert">
            <p className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating role...
            </p>
          </div>
        )}
        
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <h1 className="text-2xl font-bold mb-6">
            Edit Role: {data.name}
          </h1>
          
          <RoleForm 
            role={data}
            onSubmit={handleSubmit}
            isLoading={updateRoleMutation.isPending}
          />
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Confirm Role Update
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Are you sure you want to update the role "{data.name}"? This action might affect users with this role.
                      </p>
                      
                      {formData?.name !== data.name && (
                        <p className="mt-2 text-sm font-semibold">
                          Role name will be changed from "{data.name}" to "{formData.name}"
                        </p>
                      )}
                      
                      {Object.keys(formData?.permissions || {}).length !== 
                       Object.keys(data.permissions || {}).length && (
                        <p className="mt-2 text-sm font-semibold">
                          Permission settings will be updated
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={confirmUpdate}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Update
                </button>
                <button
                  type="button"
                  onClick={cancelUpdate}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditRolePage;