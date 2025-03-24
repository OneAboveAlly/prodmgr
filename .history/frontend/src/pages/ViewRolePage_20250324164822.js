import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import roleApi from '../api/role.api';

const ViewRolePage = () => {
  const { id } = useParams();

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

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Role Details</h1>
      <div className="bg-white shadow-md rounded p-6 mt-4">
        <h2 className="text-xl font-semibold">{data.name}</h2>
        <p className="mt-2">{data.description}</p>
        <h3 className="text-lg font-semibold mt-4">Permissions</h3>
        <ul className="list-disc list-inside">
          {data.permissions.map(permission => (
            <li key={permission.id}>{permission.module}.{permission.action}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default ViewRolePage;