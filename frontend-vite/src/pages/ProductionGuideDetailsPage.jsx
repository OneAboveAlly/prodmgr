import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import productionApi from '../api/production.api';
import PriorityBadge from '../components/production/PriorityBadge';
import StatusBadge from '../components/production/StatusBadge';
import WorkEntryList from '../components/production/WorkEntryList';
import OCRViewer from '../components/production/OCRViewer';
import ChangeHistoryPanel from '../components/production/ChangeHistoryPanel';
import StartWorkButton from '../components/production/StartWorkButton';
import StopWorkButton from '../components/production/StopWorkButton';

const ProductionGuideDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  // States
  const [sortOrder, setSortOrder] = useState('asc');
  const [showStepForm, setShowStepForm] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [stepFormData, setStepFormData] = useState({
    title: '',
    description: '',
    estimatedTime: 0,
    order: 0
  });

  // Fetch guide details
  const { 
    data: guide, 
    isLoading, 
    isError, 
    error 
  } = useQuery({
    queryKey: ['guide', id],
    queryFn: () => productionApi.getGuideById(id),
    refetchOnMount: true, // Ensure fresh data on mount
    onError: (error) => {
      toast.error(`Error loading guide: ${error.message}`);
    }
  });

  // Mutations
  const addStepMutation = useMutation({
    mutationFn: ({ guideId, formData }) => productionApi.addStep(guideId, formData),
    onSuccess: () => {
      toast.success('Step added successfully!');
      queryClient.refetchQueries(['guide', id]); // Ensure fresh data after adding a step
      resetStepForm();
    },
    onError: (error) => {
      toast.error(`Error adding step: ${error.message}`);
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: ({ stepId, formData }) => productionApi.updateStep(stepId, formData),
    onSuccess: () => {
      toast.success('Step updated successfully!');
      queryClient.refetchQueries(['guide', id]); // Ensure fresh data after updating a step
      resetStepForm();
    },
    onError: (error) => {
      toast.error(`Error updating step: ${error.message}`);
    }
  });

  const deleteStepMutation = useMutation({
    mutationFn: (stepId) => productionApi.deleteStep(stepId),
    onSuccess: () => {
      toast.success('Step deleted successfully!');
      queryClient.refetchQueries(['guide', id]); // Ensure fresh data after deleting a step
    },
    onError: (error) => {
      toast.error(`Error deleting step: ${error.message}`);
    }
  });

  // Step form handlers
  const resetStepForm = () => {
    setStepFormData({
      title: '',
      description: '',
      estimatedTime: 0,
      order: guide?.steps?.length ? Math.max(...guide.steps.map(step => step.order)) + 1 : 1
    });
    setEditingStep(null);
    setShowStepForm(false);
  };

  const handleStepFormChange = (e) => {
    const { name, value } = e.target;
    setStepFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedTime' || name === 'order' ? Number(value) : value
    }));
  };

  const openStepForm = () => {
    resetStepForm();
    setShowStepForm(true);
  };

  const openEditStepForm = (step) => {
    setStepFormData({
      title: step.title,
      description: step.description || '',
      estimatedTime: step.estimatedTime || 0,
      order: step.order
    });
    setEditingStep(step.id);
    setShowStepForm(true);
  };

  const handleStepSubmit = (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('title', stepFormData.title);
    formData.append('description', stepFormData.description);
    formData.append('estimatedTime', stepFormData.estimatedTime);
    formData.append('order', stepFormData.order);

    if (editingStep) {
      updateStepMutation.mutate({ stepId: editingStep, formData });
    } else {
      addStepMutation.mutate({ guideId: id, formData });
    }
  };

  const handleStepDelete = (stepId) => {
    if (window.confirm('Are you sure you want to delete this step?')) {
      deleteStepMutation.mutate(stepId);
    }
  };

  // Sort steps
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getSortedSteps = () => {
    if (!guide?.steps?.length) return [];
    
    return [...guide.steps].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.order - b.order;
      } else {
        return b.order - a.order;
      }
    });
  };

  // Render loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 text-lg">Loading guide details...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Render error state
  if (isError) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error:</strong>
            <span className="block">{error.message || 'Failed to load production guide details.'}</span>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/production')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Production Guides
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/production')}
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
            Back to Production Guides
          </button>
        </div>

        {/* Guide details */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{guide.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <StatusBadge status={guide.status} />
                  <PriorityBadge priority={guide.priority} />
                  {guide.deadline && (
                    <span className="text-sm text-gray-500">
                      Deadline: {new Date(guide.deadline).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Created by: {guide.createdBy?.firstName} {guide.createdBy?.lastName}
                  </span>
                </div>
              </div>
              
              {hasPermission('production', 'update') && (
                <Link
                  to={`/production/guides/${id}/edit`}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                >
                  Edit Guide
                </Link>
              )}
            </div>
            
            {guide.description && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{guide.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Steps section */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Production Steps</h2>
              
              {hasPermission('production', 'update') && !showStepForm && (
                <button
                  onClick={openStepForm}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded flex items-center"
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
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Step
                </button>
              )}
            </div>

            {/* Step form */}
            {showStepForm && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold mb-4">
                  {editingStep ? 'Edit Step' : 'Add New Step'}
                </h3>
                <form onSubmit={handleStepSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label
                        htmlFor="title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={stepFormData.title}
                        onChange={handleStepFormChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="order"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Order
                      </label>
                      <input
                        type="number"
                        id="order"
                        name="order"
                        value={stepFormData.order}
                        onChange={handleStepFormChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={stepFormData.description}
                      onChange={handleStepFormChange}
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                  </div>
                  <div className="mb-4">
                    <label
                      htmlFor="estimatedTime"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Estimated Time (minutes)
                    </label>
                    <input
                      type="number"
                      id="estimatedTime"
                      name="estimatedTime"
                      value={stepFormData.estimatedTime}
                      onChange={handleStepFormChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={resetStepForm}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={addStepMutation.isLoading || updateStepMutation.isLoading}
                    >
                      {addStepMutation.isLoading || updateStepMutation.isLoading
                        ? 'Saving...'
                        : 'Save Step'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Steps table */}
            {guide.steps && guide.steps.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={toggleSortOrder}
                      >
                        <div className="flex items-center">
                          Order
                          <svg
                            className="w-4 h-4 ml-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            {sortOrder === 'asc' ? (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            ) : (
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            )}
                          </svg>
                        </div>
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Title
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Est. Time
                      </th>
                      {hasPermission('production', 'update') && (
                        <th
                          scope="col"
                          className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {getSortedSteps().map((step) => (
                      <tr key={step.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {step.order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            <Link to={`/production/steps/${step.id}`} className="hover:text-indigo-600">
                              {step.title}
                            </Link>
                          </div>
                          {step.description && (
                            <div className="text-sm text-gray-500 line-clamp-1">
                              {step.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={step.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {step.estimatedTime ? `${step.estimatedTime} min` : '-'}
                        </td>
                        {hasPermission('production', 'update') && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openEditStepForm(step)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleStepDelete(step.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No steps have been added to this production guide yet.</p>
                {hasPermission('production', 'update') && !showStepForm && (
                  <button
                    onClick={openStepForm}
                    className="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-bold py-2 px-4 rounded"
                  >
                    Add Your First Step
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step details section - show when a step is selected */}
        {editingStep && (
          <div className="mt-8 bg-white shadow-md rounded-lg overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Step Details</h2>
                
                {/* Work control buttons */}
                {hasPermission('production', 'update') && (
                  <div className="flex space-x-2">
                    <StartWorkButton step={guide.steps.find(s => s.id === editingStep)} />
                    <StopWorkButton step={guide.steps.find(s => s.id === editingStep)} />
                  </div>
                )}
              </div>
              
              {/* Step description */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-line">{stepFormData.description || 'No description provided.'}</p>
              </div>
              
              {/* Change History Panel */}
              <ChangeHistoryPanel stepId={editingStep} />
              
              {/* OCR Text Viewer */}
              {guide.steps.find(s => s.id === editingStep)?.ocrText && (
                <OCRViewer 
                  stepId={editingStep} 
                  ocrText={guide.steps.find(s => s.id === editingStep).ocrText} 
                />
              )}
              
              {/* Work Entry List */}
              <WorkEntryList stepId={editingStep} />
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ProductionGuideDetailsPage;