// frontend-vite/src/pages/GuideTemplatesPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import productionApi from '../api/production.api';

const GuideTemplatesPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [templateData, setTemplateData] = useState({
    title: '',
    description: '',
    priority: 'NORMAL',
    deadline: ''
  });

  // Fetch guide templates
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['guideTemplates', page, limit, search],
    queryFn: () => productionApi.getGuideTemplates({
      page,
      limit,
      search
    }),
    keepPreviousData: true,
    onError: (err) => {
      toast.error(`Error loading guide templates: ${err.message}`);
    }
  });

  // Update page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTemplateData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open create form
  const openCreateForm = (template) => {
    setSelectedTemplate(template);
    setTemplateData({
      title: `Copy of ${template.title}`,
      description: template.description || '',
      priority: template.priority || 'NORMAL',
      deadline: ''
    });
    setShowCreateForm(true);
  };

  // Close create form
  const closeCreateForm = () => {
    setShowCreateForm(false);
    setSelectedTemplate(null);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!templateData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const formData = new FormData();
    formData.append('title', templateData.title);
    formData.append('description', templateData.description || '');
    formData.append('priority', templateData.priority);
    if (templateData.deadline) {
      formData.append('deadline', templateData.deadline);
    }

    productionApi.createGuideFromTemplate(selectedTemplate.id, formData)
      .then(guide => {
        toast.success('Guide created from template successfully');
        navigate(`/production/guides/${guide.id}`);
      })
      .catch(err => {
        toast.error(`Error creating guide from template: ${err.message}`);
      });
  };

  // Check permission
  if (!hasPermission('production', 'read')) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Access Denied:</strong>
            <span className="block"> You do not have permission to view guide templates.</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Guide Templates</h1>
          
          <Link
            to="/production"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded flex items-center"
          >
            <svg
              className="w-5 h-5 mr-2"
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
            Back to Guides
          </Link>
        </div>
        
        {/* Search */}
        <div className="bg-white shadow-md rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Templates
              </label>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title, description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setSearch('')}
                className={`bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded ${!search ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!search}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
        
        {/* Loading state */}
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 text-lg">Loading guide templates...</div>
          </div>
        )}
        
        {/* Error state */}
        {isError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            <strong className="font-bold">Error:</strong>
            <span className="block">{error.message}</span>
            <button 
              onClick={() => refetch()}
              className="mt-2 bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-3 rounded text-sm"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Templates List */}
        {!isLoading && !isError && (
          <>
            {data?.templates?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {data.templates.map((template) => (
                  <div 
                    key={template.id}
                    className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
                  >
                    <div className="px-6 py-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="text-lg font-bold text-gray-900">{template.title}</div>
                        <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">Template</div>
                      </div>
                      
                      {template.description && (
                        <p className="text-gray-700 text-sm mb-4 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      
                      <div className="mt-3 text-sm text-gray-500">
                        <p><span className="font-medium">Steps:</span> {template.stepCount || 0}</p>
                        <p><span className="font-medium">Created:</span> {formatDate(template.createdAt)}</p>
                      </div>
                      
                      <div className="mt-4">
                        <button
                          onClick={() => openCreateForm(template)}
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-center"
                        >
                          Use Template
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white shadow-md rounded-lg p-8 text-center">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Guide Templates Found</h3>
                <p className="text-gray-500 mb-4">
                  {search
                    ? "No templates match your search criteria."
                    : "There are no guide templates available yet."}
                </p>
                <p className="text-gray-500">
                  You can create templates by saving an existing guide as a template.
                </p>
              </div>
            )}
            
            {/* Pagination */}
            {data?.pagination && data.pagination.total > 0 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6 mt-4 rounded-lg shadow-sm">
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">{((page - 1) * limit) + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(page * limit, data.pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{data.pagination.total}</span> templates
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          page === 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="sr-only">Previous</span>
                        Previous
                      </button>
                      <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 focus:outline-offset-0">
                        {page}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(data.pagination.pages, page + 1))}
                        disabled={page >= data.pagination.pages}
                        className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                          page >= data.pagination.pages ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <span className="sr-only">Next</span>
                        Next
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create from template modal */}
      {showCreateForm && selectedTemplate && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg max-w-lg w-full mx-4 p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create Guide from Template</h2>
            <p className="text-gray-600 mb-4">
              You're creating a new guide based on the template: <strong>{selectedTemplate.title}</strong>
            </p>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={templateData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={templateData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    id="priority"
                    name="priority"
                    value={templateData.priority}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
                    type="date"
                    id="deadline"
                    name="deadline"
                    value={templateData.deadline}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Create Guide
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default GuideTemplatesPage;