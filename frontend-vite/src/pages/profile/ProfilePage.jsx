import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';
import { useForm } from 'react-hook-form';
import userApi from '../../api/user.api';

const ProfilePage = () => {
  const { user, refetchMe } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Basic profile form
  const { register: registerProfile, handleSubmit: handleSubmitProfile, formState: { errors: profileErrors }, reset: resetProfile } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phoneNumber: user?.phoneNumber || ''
    }
  });
  
  // Password change form
  const { register: registerPassword, handleSubmit: handleSubmitPassword, formState: { errors: passwordErrors }, reset: resetPassword } = useForm({
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });
  
  // Handle profile update
  const onUpdateProfile = async (data) => {
    try {
      setIsSubmitting(true);
      
      await userApi.updateMyProfile(data);
      toast.success('Profil został zaktualizowany pomyślnie');
      
      // Refresh user data
      await refetchMe();
      
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Wystąpił błąd podczas aktualizacji profilu');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle password change
  const onChangePassword = async (data) => {
    // Check if passwords match
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Nowe hasło i potwierdzenie nie są zgodne');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      await userApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      
      toast.success('Hasło zostało zmienione pomyślnie');
      resetPassword();
      
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Wystąpił błąd podczas zmiany hasła');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!user) {
    return (
      <div className="p-6 text-center text-gray-600">
        Ładowanie danych użytkownika...
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Mój profil</h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`${
              activeTab === 'profile'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Dane osobowe
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`${
              activeTab === 'security'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Bezpieczeństwo
          </button>
        </nav>
      </div>
      
      {/* Profile Information */}
      {activeTab === 'profile' && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Moje dane</h2>
          
          <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Imię</label>
                <input
                  type="text"
                  {...registerProfile('firstName', { required: 'Imię jest wymagane' })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    profileErrors.firstName ? 'border-red-500' : ''
                  }`}
                />
                {profileErrors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Nazwisko</label>
                <input
                  type="text"
                  {...registerProfile('lastName', { required: 'Nazwisko jest wymagane' })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    profileErrors.lastName ? 'border-red-500' : ''
                  }`}
                />
                {profileErrors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.lastName.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  {...registerProfile('email', { 
                    required: 'Email jest wymagany',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Nieprawidłowy format adresu email'
                    }
                  })}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                    profileErrors.email ? 'border-red-500' : ''
                  }`}
                />
                {profileErrors.email && (
                  <p className="mt-1 text-sm text-red-600">{profileErrors.email.message}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Telefon</label>
                <input
                  type="text"
                  {...registerProfile('phoneNumber')}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-3 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
              
              <button
                type="button"
                onClick={() => resetProfile({
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  phoneNumber: user.phoneNumber || ''
                })}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Security Settings */}
      {activeTab === 'security' && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Zmień hasło</h2>
          
          <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Aktualne hasło</label>
              <input
                type="password"
                {...registerPassword('currentPassword', { 
                  required: 'Aktualne hasło jest wymagane' 
                })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  passwordErrors.currentPassword ? 'border-red-500' : ''
                }`}
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Nowe hasło</label>
              <input
                type="password"
                {...registerPassword('newPassword', { 
                  required: 'Nowe hasło jest wymagane',
                  minLength: {
                    value: 8,
                    message: 'Hasło musi mieć co najmniej 8 znaków'
                  }
                })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  passwordErrors.newPassword ? 'border-red-500' : ''
                }`}
              />
              {passwordErrors.newPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Potwierdź nowe hasło</label>
              <input
                type="password"
                {...registerPassword('confirmPassword', { 
                  required: 'Potwierdzenie hasła jest wymagane',
                  validate: value => value === registerPassword('newPassword').value || 'Hasła nie są zgodne'
                })}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
                  passwordErrors.confirmPassword ? 'border-red-500' : ''
                }`}
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>
            
            <div className="flex items-center space-x-3 mt-6">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Zmienianie hasła...' : 'Zmień hasło'}
              </button>
              
              <button
                type="button"
                onClick={() => resetPassword()}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Anuluj
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProfilePage; 