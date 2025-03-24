import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import roleApi from '../../api/role.api';

const RoleForm = ({ role, onSubmit, isLoading, onChange }) => {
  const navigate = useNavigate();
  const [expandedModules, setExpandedModules] = useState({});
  
  const { register, handleSubmit, formState: { errors, isDirty }, reset, setValue, watch } = useForm({
    defaultValues: {
      name: '',
      description: '',
      permissions: {}
    }
  });
  
  // Watch permissions to show current values in the UI
  const watchedPermissions = watch('permissions');
  
  // Notify parent component when form changes
  useEffect(() => {
    if (onChange && isDirty) {
      onChange(true);
    }
  }, [isDirty, onChange]);
  
  // Fetch available system permissions
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleApi.getAllPermissions().then(res => res.data),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Convert flat permissions object to structured format by module
  const convertToStructuredPermissions = (flatPermissions) => {
    if (!flatPermissions) return {};
    const structured = {};
    
    Object.entries(flatPermissions).forEach(([key, value]) => {
      const [module, action] = key.split('.');
      if (!structured[module]) structured[module] = {};
      structured[module][action] = value;
    });
    
    return structured;
  };
  
  // Convert structured permissions back to flat format for API
  const convertToFlatPermissions = (structuredPermissions) => {
    if (!structuredPermissions) return {};
    const flat = {};
    
    Object.entries(structuredPermissions).forEach(([module, actions]) => {
      Object.entries(actions).forEach(([action, value]) => {
        if (value > 0) { // Only include non-zero permissions
          flat[`${module}.${action}`] = value;
        }
      });
    });
    
    return flat;
  };
  
  // Update form when role data is available
  useEffect(() => {
    if (role) {
      // For display, we keep the structured format in the form
      const structuredPermissions = convertToStructuredPermissions(role.permissions || {});
      
      reset({
        name: role.name || '',
        description: role.description || '',
        permissions: structuredPermissions
      });
      
      // Expand all modules that have permissions
      if (role.permissions) {
        const modules = {};
        Object.keys(role.permissions).forEach(perm => {
          const moduleName = perm.split('.')[0];
          modules[moduleName] = true;
        });
        setExpandedModules(modules);
      }
    }
  }, [role, reset]);
  
  const handleFormSubmit = (data) => {
    // Convert structured permissions back to flat format for API
    const flatPermissions = convertToFlatPermissions(data.permissions);
    
    onSubmit({
      ...data,
      permissions: flatPermissions
    });
  };
  
  // Additional form change handler to detect permission changes which might not trigger isDirty
  const handlePermissionChange = () => {
    if (onChange) {
      onChange(true);
    }
  };
  
  const handleCancel = () => {
    navigate('/roles');
  };
  
  const toggleModule = (moduleName) => {
    setExpandedModules(prev => ({
      ...prev,
      [moduleName]: !prev[moduleName]
    }));
  };
  
  // Set permission value
  const setPermissionValue = (module, action, value) => {
    setValue(`permissions.${module}.${action}`, value, { shouldDirty: true });
    handlePermissionChange();
  };
  
  // Get permission value safely
  const getPermissionValue = (module, action) => {
    return watchedPermissions?.[module]?.[action] || 0;
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Role Name</label>
          <input
            type="text"
            {...register('name', { required: 'Role name is required' })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
              ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
        
        {permissionsLoading ? (
          <div className="py-4 text-center">Loading permissions...</div>
        ) : permissionsData ? (
          <div className="border rounded-md divide-y">
            {Object.entries(permissionsData.groupedByModule || {}).map(([moduleName, modulePermissions]) => (
              <div key={moduleName} className="border-b last:border-b-0">
                <div 
                  onClick={() => toggleModule(moduleName)} 
                  className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                >
                  <h4 className="text-base font-medium text-gray-900 capitalize">{moduleName}</h4>
                  <svg 
                    className={`w-5 h-5 transition-transform ${expandedModules[moduleName] ? 'transform rotate-180' : ''}`} 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
                
                {expandedModules[moduleName] && (
                  <div className="p-4 bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permission</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">None</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Edit</th>
                          <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Full</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {modulePermissions.map((permission) => {
                          const action = permission.action;
                          return (
                            <tr key={permission.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{permission.description || action}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                <input
                                  type="radio"
                                  name={`perm_${moduleName}_${action}`}
                                  checked={getPermissionValue(moduleName, action) === 0}
                                  onChange={() => setPermissionValue(moduleName, action, 0)}
                                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                <input
                                  type="radio"
                                  name={`perm_${moduleName}_${action}`}
                                  checked={getPermissionValue(moduleName, action) === 1}
                                  onChange={() => setPermissionValue(moduleName, action, 1)}
                                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                <input
                                  type="radio"
                                  name={`perm_${moduleName}_${action}`}
                                  checked={getPermissionValue(moduleName, action) === 2}
                                  onChange={() => setPermissionValue(moduleName, action, 2)}
                                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                <input
                                  type="radio"
                                  name={`perm_${moduleName}_${action}`}
                                  checked={getPermissionValue(moduleName, action) === 3}
                                  onChange={() => setPermissionValue(moduleName, action, 3)}
                                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-4 text-center text-red-500">Failed to load permissions.</div>
        )}
      </div>
      
      <div className="flex justify-end space-x-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
        >
          {isLoading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
        </button>
      </div>
    </form>
  );
};

export default RoleForm;