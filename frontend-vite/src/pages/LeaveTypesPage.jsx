// frontend/src/pages/LeaveTypesPage.js
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import leaveApi from '../api/leave.api';
import { useAuth } from '../contexts/AuthContext';

const LeaveTypesPage = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLeaveType, setEditingLeaveType] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    paid: true,
    color: '#4F46E5'
  });

  // Fetch leave types
  const { data: leaveTypes, isLoading } = useQuery({
    queryKey: ['leaveTypes'],
    queryFn: () => leaveApi.getLeaveTypes().then(res => res.data)
  });

  // Create leave type mutation
  const createLeaveTypeMutation = useMutation({
    mutationFn: (data) => leaveApi.createLeaveType(data),
    onSuccess: () => {
      toast.success('Leave type created successfully');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to create leave type');
    }
  });

  // Update leave type mutation
  const updateLeaveTypeMutation = useMutation({
    mutationFn: (data) => leaveApi.updateLeaveType(data.id, data),
    onSuccess: () => {
      toast.success('Leave type updated successfully');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
      setIsModalOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update leave type');
    }
  });

  // Delete leave type mutation
  const deleteLeaveTypeMutation = useMutation({
    mutationFn: (id) => leaveApi.deleteLeaveType(id),
    onSuccess: () => {
      toast.success('Leave type deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['leaveTypes'] });
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to delete leave type');
    }
  });

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      paid: true,
      color: '#4F46E5'
    });
    setEditingLeaveType(null);
  };

  // Open modal for creating a new leave type
  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal for editing an existing leave type
  const openEditModal = (leaveType) => {
    setFormData({
      name: leaveType.name,
      description: leaveType.description || '',
      paid: leaveType.paid,
      color: leaveType.color
    });
    setEditingLeaveType(leaveType);
    setIsModalOpen(true);
  };

  // Close modal
  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (editingLeaveType) {
      updateLeaveTypeMutation.mutate({
        id: editingLeaveType.id,
        ...formData
      });
    } else {
      createLeaveTypeMutation.mutate(formData);
    }
  };

  // Handle leave type deletion with confirmation
  const handleDeleteLeaveType = (id, name) => {
    if (window.confirm(`Are you sure you want to delete the leave type "${name}"? This action cannot be undone.`)) {
      deleteLeaveTypeMutation.mutate(id);
    }
  };

  // If user doesn't have the required permission, don't render the page
  if (!hasPermission('leave', 'manageTypes')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong className="font-bold">Access Denied:</strong>
          <span className="block"> You do not have permission to manage leave types.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Leave Types</h1>
        <div className="flex gap-2">
          <button 
            onClick={openCreateModal}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Add Leave Type
          </button>
          <Link 
            to="/leave" 
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Leave
          </Link>
        </div>
      </div>

      {/* Leave Types Table */}
      {isLoading ? (
        <div className="text-center py-8">Loading leave types...</div>
      ) : leaveTypes?.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No leave types found. Click "Add Leave Type" to create one.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {leaveTypes?.map(leaveType => (
                <tr key={leaveType.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="h-4 w-4 rounded-full mr-3"
                        style={{ backgroundColor: leaveType.color }}
                      ></div>
                      <span className="font-medium text-gray-900">{leaveType.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{leaveType.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      leaveType.paid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {leaveType.paid ? 'Paid' : 'Unpaid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => openEditModal(leaveType)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteLeaveType(leaveType.id, leaveType.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leave Type Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen p-4">
            {/* Modal backdrop */}
            <div 
              className="fixed inset-0 bg-black opacity-50"
              onClick={closeModal}
            ></div>
            
            {/* Modal content */}
            <div className="bg-white rounded-lg shadow-xl z-10 w-full max-w-md">
              <div className="p-5 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingLeaveType ? 'Edit Leave Type' : 'Add Leave Type'}
                </h3>
              </div>
              
              <form onSubmit={handleSubmit} className="p-5">
                {/* Name */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., Vacation, Sick Leave, etc."
                  />
                </div>
                
                {/* Description */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="2"
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Brief description of this leave type"
                  ></textarea>
                </div>
                
                {/* Color */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      name="color"
                      value={formData.color}
                      onChange={handleChange}
                      className="h-8 w-8 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <span className="ml-2 text-sm text-gray-500">Pick a color for this leave type</span>
                  </div>
                </div>
                
                {/* Paid/Unpaid */}
                <div className="mb-6">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="paid"
                      name="paid"
                      checked={formData.paid}
                      onChange={handleChange}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="paid" className="ml-2 block text-sm font-medium text-gray-700">
                      Paid Leave
                    </label>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 ml-6">
                    {formData.paid 
                      ? 'Employee will be paid during this leave'
                      : 'Employee will not be paid during this leave'
                    }
                  </p>
                </div>
                
                {/* Action Buttons */}
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  
                  <button
                    type="submit"
                    disabled={createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending}
                    className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
                  >
                    {createLeaveTypeMutation.isPending || updateLeaveTypeMutation.isPending 
                      ? 'Saving...' 
                      : editingLeaveType ? 'Update' : 'Create'
                    }
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTypesPage;