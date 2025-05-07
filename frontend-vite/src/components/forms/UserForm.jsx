import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import roleApi from '../../api/role.api';

const UserForm = ({ user, onSubmit, isLoading }) => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(!user);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      firstName: '',
      lastName: '',
      login: '',
      email: '',
      phoneNumber: '',
      birthDate: '',
      password: '',
      isActive: true,
      role: '' // Zmieniono z tablicy ról na pojedynczą rolę
    }
  });
  
  // Pobierz dostępne role
  const { data: rolesData, isLoading: rolesLoading, isError: rolesError } = useQuery({
    queryKey: ['roles'],
    queryFn: () => roleApi.getAll().then(res => res.roles),
    staleTime: 1000 * 60 * 5 // 5 minut
  });
  
  // Formatuj datę dla pola wprowadzania (YYYY-MM-DD)
  const formatDateForInput = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d instanceof Date && !isNaN(d) 
      ? d.toISOString().split('T')[0]
      : '';
  };
  
  // Aktualizuj formularz, gdy dane użytkownika są dostępne
  useEffect(() => {
    if (user) {
      // Dla pojedynczego wyboru roli, weź pierwszą rolę, jeśli jest ich wiele
      // lub pozostaw pustą, jeśli ich nie ma
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
    // Usuń hasło, jeśli jest puste (dla edycji)
    if (!data.password) {
      delete data.password;
    }
    
    // Przekształć pojedynczą rolę z powrotem na format tablicy dla zgodności z API
    const formattedData = {
      ...data,
      roles: data.role ? [data.role] : []
    };
    
    // Usuń pole pojedynczej roli przed wysłaniem
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
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8 bg-gray-50 p-6 rounded-lg shadow-md">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Imię</label>
          <input
            type="text"
            {...register('firstName', { required: 'Imię jest wymagane' })}
            className={`block w-full px-4 py-3 rounded-md bg-white border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
              hover:border-indigo-300 transition-colors duration-200`}
          />
          {errors.firstName && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.firstName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nazwisko</label>
          <input
            type="text"
            {...register('lastName', { required: 'Nazwisko jest wymagane' })}
            className={`block w-full px-4 py-3 rounded-md bg-white border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
              hover:border-indigo-300 transition-colors duration-200`}
          />
          {errors.lastName && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.lastName.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Login</label>
          <input
            type="text"
            {...register('login', { required: 'Login jest wymagany' })}
            className={`block w-full px-4 py-3 rounded-md ${user ? 'bg-gray-100' : 'bg-white'} border ${errors.login ? 'border-red-500' : 'border-gray-300'} 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
              ${!user && 'hover:border-indigo-300'} transition-colors duration-200`}
            disabled={!!user} // Wyłącz pole loginu w trybie edycji
          />
          {errors.login && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.login.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input
            type="email"
            {...register('email', { 
              required: 'Email jest wymagany',
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: 'Nieprawidłowy format emaila'
              }
            })}
            className={`block w-full px-4 py-3 rounded-md bg-white border ${errors.email ? 'border-red-500' : 'border-gray-300'} 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
              hover:border-indigo-300 transition-colors duration-200`}
          />
          {errors.email && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.email.message}</p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Numer telefonu</label>
          <input
            type="text"
            {...register('phoneNumber')}
            className="block w-full px-4 py-3 rounded-md bg-white border border-gray-300 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
              hover:border-indigo-300 transition-colors duration-200"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Data urodzenia</label>
          <input
            type="date"
            {...register('birthDate')}
            className="block w-full px-4 py-3 rounded-md bg-white border border-gray-300 
              shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
              hover:border-indigo-300 transition-colors duration-200"
          />
        </div>
        
        <div>
          <div className="flex justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Hasło</label>
            {!user && <span className="text-sm text-gray-500">(Wymagane dla nowych użytkowników)</span>}
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              {...register('password', { 
                required: !user ? 'Hasło jest wymagane dla nowych użytkowników' : false,
                minLength: !user || showPassword ? {
                  value: 8,
                  message: 'Hasło musi mieć co najmniej 8 znaków'
                } : undefined
              })}
              className={`block w-full px-4 py-3 rounded-md bg-white border ${errors.password ? 'border-red-500' : 'border-gray-300'} 
                shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 
                hover:border-indigo-300 transition-colors duration-200 pr-16`}
            />
            <button 
              type="button"
              onClick={toggleShowPassword}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 px-2 py-1 text-sm text-indigo-600 
                bg-white rounded border border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              {showPassword ? 'Ukryj' : 'Pokaż'}
            </button>
          </div>
          {errors.password && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.password.message}</p>
          )}
          {user && (
            <p className="mt-2 text-sm text-gray-500">Pozostaw puste, aby zachować obecne hasło</p>
          )}
        </div>
      </div>
      
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
        <div className="mt-1">
          <label className="inline-flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors duration-200">
            <input
              type="checkbox"
              {...register('isActive')}
              className="h-5 w-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="ml-3 text-sm font-medium text-gray-700">Aktywny</span>
          </label>
        </div>
      </div>
      
      <div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
        <label className="block text-sm font-medium text-gray-700 mb-3">Rola</label>
        <div className="mt-1 space-y-2">
          {rolesLoading && <p className="p-3 bg-blue-50 text-blue-700 rounded">Ładowanie ról...</p>}
          {rolesError && <p className="p-3 bg-red-50 text-red-700 rounded">Błąd podczas ładowania ról</p>}
          
          {/* Grupa przycisków radiowych dla wyboru roli */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rolesData?.map(role => (
              <label key={role.id} className="inline-flex items-center p-3 border border-gray-200 rounded-lg 
                hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors duration-200">
                <input
                  type="radio"
                  value={role.id}
                  {...register('role', { required: 'Proszę wybrać rolę' })}
                  className="h-5 w-5 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="ml-3 text-sm font-medium text-gray-700">{role.name}</span>
              </label>
            ))}
          </div>
          
          {errors.role && (
            <p className="mt-2 text-sm text-red-600 font-medium">{errors.role.message}</p>
          )}
          
          {/* Opcja bez roli */}
          <div className="mt-4">
            <label className="inline-flex items-center p-3 border border-gray-200 rounded-lg 
              hover:bg-indigo-50 hover:border-indigo-300 cursor-pointer transition-colors duration-200">
              <input
                type="radio"
                value=""
                {...register('role')}
                className="h-5 w-5 rounded-full border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="ml-3 text-sm font-medium text-gray-700">Brak roli</span>
            </label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-4 pt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 
            bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 
            transition-colors duration-200"
        >
          Anuluj
        </button>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white 
            bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
            disabled:bg-indigo-400 transition-colors duration-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Zapisywanie...
            </>
          ) : (
            user ? 'Aktualizuj użytkownika' : 'Utwórz użytkownika'
          )}
        </button>
      </div>
    </form>
  );
};

export default UserForm;