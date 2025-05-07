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
    barcode: '',
  });

  // Fetch guide with proper error handling and loading state
  const { data: guide, isLoading, isError, error } = useQuery({
    queryKey: ['guide', id],
    queryFn: async () => {
      try {
        console.log('Fetching guide with ID:', id);
        // Request complete data to ensure we have everything needed
        const result = await productionApi.getGuideById(id, {
          includeSteps: true,
          includeStats: true,
          includeTimeData: true
        });
        console.log('Guide data received:', result);
        
        // Check if the API returned an error object
        if (result && result.error === true) {
          throw new Error(result.message || "Failed to fetch guide");
        }
        
        return result;
      } catch (err) {
        console.error("Error fetching guide:", err);
        throw err;
      }
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 0
  });

  // Populate form when guide data is loaded - use proper guide data structure
  useEffect(() => {
    if (guide) {
      console.log('Setting form with guide data:', guide);
      // Handle both nested and flat response structures
      const guideData = guide.guide || guide;
      
      setForm({
        title: guideData.title || '',
        description: guideData.description || '',
        priority: guideData.priority || 'NORMAL',
        status: guideData.status || 'DRAFT',
        deadline: guideData.deadline ? new Date(guideData.deadline).toISOString().split('T')[0] : '',
        barcode: guideData.barcode || '',
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
                <option value="DRAFT">Szkic</option>
                <option value="IN_PROGRESS">W trakcie</option>
                <option value="COMPLETED">Zakończony</option>
                <option value="CANCELLED">Anulowany</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                Priorytet
              </label>
              <select
                id="priority"
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="LOW">Niski</option>
                <option value="NORMAL">Normalny</option>
                <option value="HIGH">Wysoki</option>
                <option value="CRITICAL">Krytyczny</option>
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
