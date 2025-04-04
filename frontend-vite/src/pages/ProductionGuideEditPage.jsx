// src/pages/ProductionGuideEditPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import productionApi from '../api/production.api';
import MainLayout from '../components/layout/MainLayout';
import { toast } from 'react-toastify';

const ProductionGuideEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    status: 'DRAFT',
    deadline: '',
  });

  // Fetch guide with proper error handling and loading state
  const { data: guide, isLoading, isError, error } = useQuery({
    queryKey: ['guide', id],
    queryFn: () => {
      console.log('Fetching guide with ID:', id);
      return productionApi.getGuideById(id);
    },
    onSuccess: (data) => {
      console.log('Guide data received:', data);
    },
    onError: (err) => {
      console.error('Error fetching guide:', err);
      toast.error(`Failed to load guide: ${err.message}`);
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0
  });

  // Populate form when guide data is loaded
  useEffect(() => {
    if (guide) {
      console.log('Setting form with guide data:', guide);
      setForm({
        title: guide.title || '',
        description: guide.description || '',
        priority: guide.priority || 'NORMAL',
        status: guide.status || 'DRAFT',
        deadline: guide.deadline ? new Date(guide.deadline).toISOString().split('T')[0] : '',
      });
    }
  }, [guide]);

  // Update mutation with proper feedback
  const updateMutation = useMutation({
    mutationFn: (formData) => productionApi.updateGuide(id, formData),
    onSuccess: () => {
      toast.success('Production guide updated successfully!');
      queryClient.invalidateQueries(['guide', id]);
      queryClient.invalidateQueries(['productionGuides']);
      navigate(`/production/guides/${id}`);
    },
    onError: (err) => toast.error(`Update failed: ${err.message}`),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    
    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => {
      formData.append(key, value);
    });
    
    updateMutation.mutate(formData);
  };

  // Show loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 text-lg">Loading guide data...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Show error state
  if (isError) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error loading guide:</p>
            <p>{error.message}</p>
          </div>
          <button
            onClick={() => navigate('/production')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
          >
            Back to Production Guides
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          to={`/production/guides/${id}`}
          className="flex items-center text-indigo-600 hover:text-indigo-900"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Guide Details
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Edit Production Guide</h1>
        <p className="text-gray-600">Update the details of this production guide</p>
      </div>
      
      <div className="bg-white shadow-md rounded-lg p-6">
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={form.title}
              onChange={handleChange}
              required
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows="4"
              value={form.description}
              onChange={handleChange}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={form.status}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="DRAFT">Draft</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
                Deadline (optional)
              </label>
              <input
                id="deadline"
                name="deadline"
                type="date"
                value={form.deadline}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => navigate(`/production/guides/${id}`)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
              disabled={updateMutation.isLoading}
            >
              {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductionGuideEditPage;
