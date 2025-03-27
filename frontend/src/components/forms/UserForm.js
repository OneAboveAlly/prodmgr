import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import roleApi from '../../api/role.api';

const UserForm = ({ user, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(!user);
  
  const { register, handleSubmit, formState: { errors }, reset, /*setValue, watch*/ } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      login: '',
      email: '',
      phoneNumber: '',
      birthDate: '',
      password: '',
      isActive: true,
      role: '' // Changed from roles array to single role string
    }
  });
  
  // Watch selected role
  //const selectedRole = watch('role');
  
  // Fetch available roles
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll().then(res => res.roles),
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Format date for input field (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d instanceof Date && !isNaN(d) 
      ? d.toISOString().split('T')[0]
      : '';
  };
  
  // Update form when user data is available
  useEffect(() => {
    if (user) {
      // For single role selection, take the first role if there are multiple
      // or leave it empty if there are none
      const roleId = user.roles?.length > 0 ? user.roles[0].id : '';
      
      reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        login: user.login || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        birthDate: formatDateForInput(user.birthDate),
        isActive: user.isActive !== undefined ? user.isActive : true,
        role: roleId
      });
    }
  }, [user, reset]);
  
  const handleFormSubmit = (data) => {
    // Remove password if it's empty (for edit)
    if (!data.password) {
      delete data.password;
    }
    
    // Convert single role back to array format for API compatibility
    const formattedData = {
      ...data,
      roles: data.role ? [data.role] : []
    };
    
    // Remove the single role field before submitting
    delete formattedData.role;
    
    onSubmit(formattedData);
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
          <label className="block text-sm font-medium text-gray-700">Birth Date</label>
          <input
            type="date"
            {...register('birthDate')}
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
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <div className="mt-1 space-y-2">
          {rolesLoading && <p>Loading roles...</p>}
          {rolesError && <p>Error loading roles</p>}
          
          {/* Radio Group for Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rolesData?.map(role => (
              <label key={role.id} className="inline-flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  value={role.id}
                  {...register('role', { required: 'Please select a role' })}
                  className="rounded-full border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <span className="ml-2 text-sm text-gray-700">{role.name}</span>
              </label>
            ))}
          </div>
          
          {errors.role && (
            <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
          )}
          
          {/* No Role Option */}
          <div className="mt-4">
            <label className="inline-flex items-center p-2 border rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value=""
                {...register('role')}
                className="rounded-full border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span className="ml-2 text-sm text-gray-700">No Role</span>
            </label>
          </div>
        </div>
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