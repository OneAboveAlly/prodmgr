import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import UserForm from '../components/forms/UserForm';
import userApi from '../api/user.api';

const CreateUserPage = () => {
  const navigate = useNavigate();
  
  const createUserMutation = useMutation({
    mutationFn: (userData) => userApi.create(userData),
    onSuccess: () => {
      toast.success('Użytkownik został stworzony');
      navigate('/users');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Błąd podczas tworzenia użytkownika');
    }
  });
  
  const handleSubmit = (data) => {
    createUserMutation.mutate(data);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Stwórz nowego użytkownika</h1>
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
          <UserForm 
            onSubmit={handleSubmit} 
            isLoading={createUserMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
};

export default CreateUserPage;