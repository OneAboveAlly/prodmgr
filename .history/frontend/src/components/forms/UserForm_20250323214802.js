import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import roleApi from '../../api/role.api';

const UserForm = ({ user, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(!user);
  const [selectedRoles, setSelectedRoles] = useState([]); // Track selected roles
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      login: '',
      email: '',
      phoneNumber: '',
      password: '',
      isActive: true,
      roles: []
    }
  });
  
  // Watch roles to update the selectedRoles state
  const watchedRoles = watch('roles');
  
  // Effect to sync the watched roles with our state
  useEffect(() => {
    if (watchedRoles) {
      setSelectedRoles(Array.isArray(watchedRoles) ? watchedRoles : []);
    }
  }, [watchedRoles]);
  
  // Fetch available roles
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: async () => {
      try {
        const response = await roleApi.getAll();
        // Ensure we return an array of roles
        if (Array.isArray(response.data)) {
          return response.data;
        } else if (response.data && Array.isArray(response.data.roles)) {
          return response.data.roles;
        } else if (response.data) {
          // If data exists but isn't in the expected format, try to extract roles
          return Object.values(response.data).filter(item => 
            item && typeof item === 'object' && 'id' in item && 'name' in item
          );
        }
        // If all else fails, return empty array to prevent mapping errors
        return [];
      } catch (error) {
        console.error("Error fetching roles:", error);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Update form when user data is available
  useEffect(() => {
    if (user) {
      const userRoles = user.roles && Array.isArray(user.roles) 
        ? user.roles.map(role => role.id || role) 
        : [];
      
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        login: user.login || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        isActive: user.isActive !== undefined ? user.isActive : true,
        roles: userRoles
      });
      
      // Update selectedRoles state
      setSelectedRoles(userRoles);
    }
  }, [user, reset]);
  
  const handleFormSubmit = (data) => {
    // Remove password if it's empty (for edit)
    if (!data.password) {
      delete data.password;
    }
    
    // Ensure isActive is set to true by default for new users
    if (!user) {
      data.isActive = data.isActive !== undefined ? data.isActive : true;
    }
    
    // Make sure roles is an array with proper values
    data.roles = Array.isArray(data.roles) 
      ? data.roles.filter(Boolean) // Filter out any falsy values
      : [];
    
    onSubmit(data);
  };
  
  const handleCancel = () => {
    navigate('/users');
  };
  
  const toggleShowPassword = () => {
    setShowPassword(!showPassword);
  };
  
  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">First Name</label>
          <input
            type="text"
            {...register('firstName', { required: 'First name is required' })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
              ${errors.firstName ? 'border-red-500' : ''}`}
          />
          {errors.firstName && (
            <p className="mt-1 text-sm text-red-600">{errors.firstName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Last Name</label>
          <input
            type="text"
            {...register('lastName', { required: 'Last name is required' })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
              ${errors.lastName ? 'border-red-500' : ''}`}
          />
          {errors.lastName && (
            <p className="mt-1 text-sm text-red-600">{errors.lastName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Login</label>
          <input
            type="text"
            {...register('login', { required: 'Login is required' })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
              ${errors.login ? 'border-red-500' : ''}`}
            disabled={!!user} // Disable login field in edit mode
          />
          {errors.login && (
            <p className="mt-1 text-sm text-red-600">{errors.login.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Invalid email format'
              }
            })}
            className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
              ${errors.email ? 'border-red-500' : ''}`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="text"
            {...register('phoneNumber')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
        
        <div>
          <div className="flex justify-between">
            <label className="block text-sm font-medium text-gray-700">Password</label>
            {!user && <span className="text-sm text-gray-500">(Required for new users)</span>}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register('password', { 
                required: !user ? 'Password is required for new users' : false,
                minLength: !user || showPassword ? {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                } : undefined
              })}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm
                ${errors.password ? 'border-red-500' : ''}`}
            />
            <button 
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 -mt-3 text-sm text-gray-500"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
          )}
          {user && (
            <p className="mt-1 text-sm text-gray-500">Leave blank to keep current password</p>
          )}
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Status</label>
        <div className="mt-1">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              {...register('isActive')}
              className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
            <span className="ml-2 text-sm text-gray-700">Active</span>
          </label>
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Roles</label>
        {rolesLoading ? (
          <div className="mt-2 text-sm text-gray-500">Loading roles...</div>
        ) : rolesError ? (
          <div className="mt-2 text-sm text-red-500">Failed to load roles</div>
        ) : !rolesData || !Array.isArray(rolesData) || rolesData.length === 0 ? (
          <div className="mt-2 text-sm text-gray-500">No roles available</div>
        ) : (
          <div className="mt-1 space-y-2 border rounded-md p-3">
            {rolesData.map(role => (
              <label key={role.id} className="inline-flex items-center mr-4 p-1">
                <input
                  type="checkbox"
                  value={role.id}
                  {...register('roles')}
                  className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">{role.name}</span>
              </label>
            ))}
          </div>
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
          {isLoading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </button>
      </div>
    </form>
  );
};

export default UserForm;