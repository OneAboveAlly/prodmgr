import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import templatesApi from '../../api/templates.api';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../../components/common/Spinner';
import { 
  Copy, 
  Trash2, 
  Search, 
  Filter, 
  Plus, 
  BookOpen,
  UserCheck
} from 'lucide-react';

const ProductionTemplatesPage = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Fetch templates
  const { 
    data: templates = [], 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['productionTemplates'],
    queryFn: templatesApi.getAllTemplates,
    select: data => data.templates || []
  });
  
  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: templatesApi.deleteTemplate,
    onSuccess: () => {
      toast.success('Template deleted successfully');
      queryClient.invalidateQueries(['productionTemplates']);
    },
    onError: (error) => {
      console.error('Error deleting template:', error);
      toast.error(error.response?.data?.message || 'Error deleting template');
    }
  });
  
  // Handle search and filtering
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = searchTerm === '' || 
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = categoryFilter === '' || template.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });
  
  // Get unique categories for filter dropdown
  const categories = [...new Set(templates.map(t => t.category).filter(Boolean))];
  
  // Handle template deletion
  const handleDeleteTemplate = (templateId) => {
    if (window.confirm('Are you sure you want to delete this template? This action cannot be undone.')) {
      deleteTemplateMutation.mutate(templateId);
    }
  };
  
  // Handle creating a guide from template
  const handleUseTemplate = (templateId) => {
    // This would open a modal to configure the new guide
    setSelectedTemplate(templates.find(t => t.id === templateId));
    setIsCreateModalOpen(true);
  };
  
  if (isLoading) return <Spinner label="Loading templates..." />;
  
  if (isError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-red-100 text-red-800 p-4 rounded-lg">
          <h2 className="text-lg font-semibold">❌ Error:</h2>
          <p>{error?.message || 'Unable to fetch templates'}</p>
        </div>
        <button
          onClick={() => queryClient.invalidateQueries(['productionTemplates'])}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
        >
          Try Again
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Production Guide Templates</h1>
        <button
          onClick={() => navigate('/production/guides')}
          className="px-4 py-2 text-indigo-600 hover:text-indigo-800"
        >
          Back to Guides
        </button>
      </div>
      
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full border border-gray-300 rounded pl-10 pr-4 py-2"
          />
        </div>
        
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">All Categories</option>
          {categories.map(category => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
      </div>
      
      {filteredTemplates.length === 0 ? (
        <div className="bg-white p-8 text-center rounded-lg shadow">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">No templates found matching your criteria.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setCategoryFilter('');
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Show All Templates
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map(template => (
            <div
              key={template.id}
              className="bg-white shadow rounded-xl p-4 border border-gray-200 hover:border-indigo-400 transition"
            >
              <div className="flex justify-between items-start">
                <h2 className="font-semibold text-lg text-gray-800">
                  {template.name}
                </h2>
                {template.category && (
                  <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">
                    {template.category}
                  </span>
                )}
              </div>
              
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                {template.description || 'No description provided.'}
              </p>
              
              <div className="mt-3 text-sm text-gray-500">
                <div className="flex items-center gap-1 mb-1">
                  <UserCheck size={14} />
                  <span>{template.isPublic ? 'Public template' : 'Private template'}</span>
                </div>
                <p>Steps: {template.stepCount || 0}</p>
                <p>Created: {new Date(template.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div className="mt-4 flex justify-end gap-2">
                {hasPermission('production', 'create') && (
                  <button
                    onClick={() => handleUseTemplate(template.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                    title="Create guide from this template"
                  >
                    <Copy size={14} />
                    Use
                  </button>
                )}
                
                {(hasPermission('production', 'delete') || template.createdById === user?.id) && (
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                    title="Delete this template"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* TODO: Add the CreateFromTemplateModal component here when implemented */}
      {isCreateModalOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">Create Guide from Template</h3>
            <p className="mb-4">
              Create a new production guide based on template: <strong>{selectedTemplate.name}</strong>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              The new guide will include all steps, inventory items and role assignments from the template.
            </p>
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  // Here you would call the API to create a guide from template
                  // For now, we'll just navigate to the new guide form
                  navigate('/production/guides/new');
                  setIsCreateModalOpen(false);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
              >
                Create Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionTemplatesPage;