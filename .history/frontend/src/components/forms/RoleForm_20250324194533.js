import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import roleApi from '../../api/role.api';

const RoleForm = ({ role, onSubmit, isLoading, onChange }) => {
  const navigate = useNavigate();
  const [expandedModules, setExpandedModules] = useState({});

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm({
    defaultValues: {
      name: '',
      description: '',
      permissions: {},
    },
  });

  const watchedPermissions = watch('permissions');

  // Notify parent when form is dirty
  useEffect(() => {
    if (onChange && isDirty) {
      onChange(true);
    }
  }, [isDirty, onChange]);

  // Get all permissions from API
  const { data: permissionsData, isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => roleApi.getAllPermissions().then((res) => res.data),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (role) {
      reset({
        name: role.name || '',
        description: role.description || '',
        permissions: { ...role.permissions } || {},
      });

      const initialModules = {};
      Object.keys(role.permissions || {}).forEach((permKey) => {
        const module = permKey.split('.')[0];
        initialModules[module] = true;
      });

      setExpandedModules(initialModules);
    }
  }, [role, reset]);

  const handleFormSubmit = (data) => {
    const cleanPermissions = {};
    Object.entries(data.permissions || {}).forEach(([key, value]) => {
      const numericValue = parseInt(value, 10);
      if (numericValue > 0) {
        cleanPermissions[key] = numericValue;
      }
    });

    onSubmit({
      ...data,
      permissions: cleanPermissions,
    });
  };

  const handlePermissionChange = () => {
    if (onChange) {
      onChange(true);
    }
  };

  const toggleModule = (moduleName) => {
    setExpandedModules((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  const getPermissionValue = (permKey) => {
    const value = watchedPermissions?.[permKey];
    if (value === undefined || value === null) return 0;
    return parseInt(value);
  };
  

  const setPermissionValue = (permKey, value) => {
    setValue(`permissions.${permKey}`, value, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    handlePermissionChange();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">Role Name</label>
          <input
            type="text"
            {...register('name', { required: 'Role name is required' })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm ${
              errors.name ? 'border-red-500' : ''
            }`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            {...register('description')}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm sm:text-sm"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Permissions</h3>
        {permissionsLoading ? (
          <div className="py-4 text-center">Loading permissions...</div>
        ) : permissionsData ? (
          <div className="border rounded-md divide-y">
            {Object.entries(permissionsData.groupedByModule).map(([moduleName, modulePermissions]) => (
              <div key={moduleName}>
                <div
                  onClick={() => toggleModule(moduleName)}
                  className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer"
                >
                  <h4 className="text-base font-medium text-gray-900 capitalize">{moduleName}</h4>
                  <span>{expandedModules[moduleName] ? '▲' : '▼'}</span>
                </div>

                {expandedModules[moduleName] && (
                  <div className="p-4 bg-white">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permission</th>
                          <th className="text-center">None</th>
                          <th className="text-center">View</th>
                          <th className="text-center">Edit</th>
                          <th className="text-center">Full</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {modulePermissions.map((perm) => {
                          const key = `${perm.module}.${perm.action}`;
                          const currentVal = getPermissionValue(key);

                          return (
                            <tr key={perm.id}>
                              <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                                {perm.description || perm.action}
                              </td>
                              {[0, 1, 2, 3].map((val) => (
                                <td className="text-center" key={val}>
                                  <input
                                    type="radio"
                                    name={`perm_${key}`}
                                    checked={currentVal === val}
                                    onChange={() => setPermissionValue(key, val)}
                                    className="h-4 w-4 text-indigo-600"
                                  />
                                </td>
                              ))}
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
          onClick={() => navigate('/roles')}
          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isLoading ? 'Saving...' : role ? 'Update Role' : 'Create Role'}
        </button>
      </div>
    </form>
  );
};

export default RoleForm;
