// frontend-vite/src/pages/ProductionGuideDetailsPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import productionApi from '../api/production.api';
import PriorityBadge from '../components/production/PriorityBadge';
import StatusBadge from '../components/production/StatusBadge';
import AttachmentsViewer from '../components/production/AttachmentsViewer';
import WorkTimeHistory from '../components/production/WorkTimeHistory';
import ProgressBar from '../components/production/ProgressBar';

// Step Assignment Modal Component
const StepAssignmentModal = ({ step, isOpen, onClose }) => {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [stepUsers, setStepUsers] = useState([]);
  const queryClient = useQueryClient();

  // Fetch current step assignments when modal opens
  useEffect(() => {
    if (isOpen && step) {
      setIsLoading(true);
      // Get current assigned users for this step
      productionApi.getStepAssignedUsers(step.id)
        .then(users => {
          setStepUsers(users);
          setSelectedUsers(users.map(u => u.id));
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error loading step users:', err);
          setIsLoading(false);
        });
    }
  }, [isOpen, step]);

  // Fetch all users for selection
  const { data: usersData } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => productionApi.getAllUsers({ search: searchTerm }),
    enabled: isOpen,
  });

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) return prev.filter(id => id !== userId);
      return [...prev, userId];
    });
  };

  const handleSave = () => {
    if (!step) return;

    productionApi.assignUsersToStep(step.id, selectedUsers)
      .then(() => {
        toast.success('Users assigned to step successfully');
        onClose();
        queryClient.refetchQueries(['guide', step.guideId]);
      })
      .catch(err => {
        toast.error(`Error assigning users to step: ${err.message}`);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Assign Users to Step: {step?.title}</h2>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {isLoading ? (
          <div className="text-center py-4">Loading users...</div>
        ) : (
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded mb-4">
            {usersData?.users?.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {usersData.users.map(user => (
                  <li key={user.id} className="p-2 hover:bg-gray-100">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => handleUserSelection(user.id)}
                        className="h-4 w-4 text-indigo-600"
                      />
                      <span>{user.firstName} {user.lastName}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="p-4 text-center">No users found</p>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            Save Assignments
          </button>
        </div>
      </div>
    </div>
  );
};

const ProductionGuideDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();

  // States
  const [sortOrder, setSortOrder] = useState('asc');
  const [showStepForm, setShowStepForm] = useState(false);
  const [showAssignUsers, setShowAssignUsers] = useState(false);
  const [editingStep, setEditingStep] = useState(null);
  const [stepFormData, setStepFormData] = useState({
    title: '',
    description: '',
    estimatedTime: 0,
    order: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedStep, setSelectedStep] = useState(null);
  const [showStepAssignModal, setShowStepAssignModal] = useState(false);

  // Fetch guide details
  const { 
    data: guide, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['guide', id],
    queryFn: async () => {
      try {
        console.log("Fetching guide with ID:", id);
        const result = await productionApi.getGuideById(id);
        console.log("Guide fetch result:", result);
        
        // Check if the API returned an error object
        if (result && result.error === true) {
          // Convert API error objects to thrown errors for consistent handling
          throw new Error(result.message || "Failed to fetch guide");
        }
        
        return result;
      } catch (err) {
        console.error("Error fetching guide:", err);
        throw err;
      }
    },
    refetchOnMount: true,
    onSuccess: (data) => {
      console.log("Guide loaded successfully:", data);
    },
    onError: (error) => {
      console.error("Error loading guide:", error);
      toast.error(`Error loading guide: ${error.message}`);
    }
  });

  // Check if we actually have a guide with a title or other required fields
  // This handles cases where the API returns a non-null object but it's not a valid guide
  const isValidGuide = guide && (guide.title || (guide.guide && guide.guide.title));

  // Use nullable guide if API returns nested structure
  const guideData = guide?.guide || (isValidGuide ? guide : null);
  const statsData = guide?.stats || {};

  // Fetch users for user assignment
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ['users', searchTerm],
    queryFn: () => productionApi.getAllUsers({ search: searchTerm }),
    enabled: showAssignUsers,
    onError: (error) => {
      toast.error(`Error loading users: ${error.message}`);
    }
  });

  // Mutations
  const addStepMutation = useMutation({
    mutationFn: ({ guideId, formData }) => productionApi.addStep(guideId, formData),
    onSuccess: () => {
      toast.success('Step added successfully!');
      queryClient.refetchQueries(['guide', id]);
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
      queryClient.refetchQueries(['guide', id]);
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
      queryClient.refetchQueries(['guide', id]);
    },
    onError: (error) => {
      toast.error(`Error deleting step: ${error.message}`);
    }
  });

  const deleteGuideMutation = useMutation({
    mutationFn: (guideId) => productionApi.deleteGuide(guideId),
    onSuccess: () => {
      toast.success('Production guide deleted successfully!');
      navigate('/production');
    },
    onError: (error) => {
      console.error('Delete guide error:', error);
      toast.error(error.message || 'Error deleting guide');
    }
  });

  const handleGuideDelete = () => {
    if (window.confirm('Are you sure you want to delete this production guide? This action cannot be undone.')) {
      console.log('Initiating delete for guide:', id);
      deleteGuideMutation.mutate(id);
    }
  };

  const assignUsersMutation = useMutation({
    mutationFn: (data) => productionApi.assignUsers(data.guideId, data.userIds),
    onSuccess: () => {
      toast.success('Users assigned successfully!');
      setShowAssignUsers(false);
      queryClient.refetchQueries(['guide', id]);
    },
    onError: (error) => {
      toast.error(`Error assigning users: ${error.message}`);
    }
  });

  // Add a new mutation for removing users
  const removeUserMutation = useMutation({
    mutationFn: (userId) => productionApi.removeUser(id, userId),
    onSuccess: () => {
      toast.success('User removed successfully!');
      queryClient.refetchQueries(['guide', id]);
    },
    onError: (error) => {
      toast.error(`Error removing user: ${error.message}`);
    }
  });

  // Add handler for removing users
  const handleRemoveUser = (userId, userName) => {
    if (window.confirm(`Are you sure you want to remove ${userName} from this guide?`)) {
      removeUserMutation.mutate(userId);
    }
  };

  // Initialize form data when guide is loaded or steps change
  useEffect(() => {
    if (guideData) {
      setStepFormData(prev => ({
        ...prev,
        order: guideData.steps?.length ? Math.max(...guideData.steps.map(step => step.order)) + 1 : 1
      }));
    }
  }, [guideData]);

  // Step form handlers
  const resetStepForm = () => {
    setStepFormData({
      title: '',
      description: '',
      estimatedTime: 0,
      order: guideData?.steps?.length ? Math.max(...guideData.steps.map(step => step.order)) + 1 : 1
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
    formData.append('description', stepFormData.description || '');
    formData.append('estimatedTime', stepFormData.estimatedTime);
    formData.append('order', stepFormData.order);

    if (editingStep) {
      // Check if we need to update the status based on time changes
      const currentStep = guideData.steps.find(step => step.id === editingStep);
      
      if (currentStep && currentStep.actualTime) {
        // Case 1: If the step was completed but now needs more time
        if (currentStep.status === 'COMPLETED' && 
            parseInt(stepFormData.estimatedTime) > currentStep.actualTime) {
          formData.append('status', 'IN_PROGRESS');
          toast.info('Step status changed to In Progress due to increased time estimate.');
        } 
        // Case 2: If step was in progress but now the time matches
        else if (currentStep.status === 'IN_PROGRESS' && 
                 parseInt(stepFormData.estimatedTime) <= currentStep.actualTime) {
          formData.append('status', 'COMPLETED');
          toast.info('Step status changed to Completed as the estimated time now matches or is less than the actual time worked.');
        }
      }
      
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

  // User assignment handlers
  const handleToggleAssignUsers = () => {
    if (!showAssignUsers && guideData) {
      const currentAssignedUsers = guideData.assignedUsers?.map(a => a.userId) || [];
      setSelectedUsers(currentAssignedUsers);
    }
    setShowAssignUsers(!showAssignUsers);
    setSearchTerm('');
  };

  const handleUserSelection = (userId) => {
    setSelectedUsers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleAssignUsers = () => {
    assignUsersMutation.mutate({
      guideId: id,
      userIds: selectedUsers
    });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Sort steps
  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  const getSortedSteps = () => {
    if (!guideData?.steps?.length) return [];

    return [...guideData.steps].sort((a, b) => {
      if (sortOrder === 'asc') {
        return a.order - b.order;
      } else {
        return b.order - a.order;
      }
    });
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString();
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error:</strong>
            <span className="block">{error?.message || 'Failed to load production guide details.'}</span>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/production')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Production Guides
            </button>
            <button
              onClick={() => refetch()}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-2 px-4 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // If guide is not found or data is invalid
  if (!isValidGuide) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Notice:</strong>
            <span className="block">
              Production guide not found or has been deleted.
            </span>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => {
                console.log("Attempting to refetch guide");
                refetch();
              }}
              className="bg-indigo-100 hover:bg-indigo-200 text-indigo-800 font-bold py-2 px-4 rounded"
            >
              Try Again
            </button>
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

  // Main content render
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
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{guideData.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <StatusBadge status={guideData.status} />
                  <PriorityBadge priority={guideData.priority} />
                  {guideData.deadline && (
                    <span className="text-sm text-gray-500">
                      Deadline: {formatDate(guideData.deadline)}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    Barcode: {guideData.barcode}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                {hasPermission('production', 'update') && (
                  <Link
                    to={`/production/guides/${id}/edit`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Edit Guide
                  </Link>
                )}
                {hasPermission('production', 'update') && (
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to archive this guide?')) {
                        toast.info('Archiving guide...');
                        productionApi.archiveGuide(id)
                          .then((response) => {
                            console.log('Archive response:', response);
                            toast.success('Guide archived successfully');
                            navigate('/production');
                          })
                          .catch(err => {
                            console.error('Archive error details:', err);
                            const errorMessage = 
                              err.response?.data?.message || 
                              err.message || 
                              'Unknown error';
                            toast.error(`Error archiving guide: ${errorMessage}. Please try again later.`);
                          });
                      }
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Archive
                  </button>
                )}
                {hasPermission('production', 'delete') && (
                  <button
                    onClick={handleGuideDelete}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                    disabled={deleteGuideMutation.isLoading}
                  >
                    {deleteGuideMutation.isLoading ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
            {guideData.description && (
              <div className="mt-4">
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-700 whitespace-pre-line">{guideData.description}</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-6">
              <ProgressBar guide={guideData} />
            </div>

            {/* Guide stats */}
            {statsData && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Steps Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Total Steps</p>
                      <p className="text-lg font-medium">{statsData.steps?.total || guideData.steps?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Completed</p>
                      <p className="text-lg font-medium">{statsData.steps?.completed || guideData.steps?.filter(s => s.status === 'COMPLETED').length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">In Progress</p>
                      <p className="text-lg font-medium">{statsData.steps?.inProgress || guideData.steps?.filter(s => s.status === 'IN_PROGRESS').length || 0}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pending</p>
                      <p className="text-lg font-medium">{statsData.steps?.pending || guideData.steps?.filter(s => s.status === 'PENDING').length || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Time Stats</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs text-gray-500">Est. Total Time</p>
                      <p className="text-lg font-medium">
                        {statsData.time?.totalEstimatedTime || 
                          guideData.steps?.reduce((sum, step) => sum + (step.estimatedTime || 0), 0) || 0} min
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Actual Time</p>
                      <p className="text-lg font-medium">
                        {statsData.time?.totalActualTime || 
                          guideData.steps?.reduce((sum, step) => sum + (step.actualTime || 0), 0) || 0} min
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Time Efficiency</p>
                      <p className="text-lg font-medium">
                        {statsData.time?.progress ? 
                          `${Math.round(statsData.time.progress)}%` : 
                          'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Assigned Users Section */}
            <div className="mt-6">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold">Assigned Users</h2>
                {hasPermission('production', 'update') && (
                  <button
                    onClick={handleToggleAssignUsers}
                    className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                  >
                    {showAssignUsers ? 'Cancel' : 'Manage Users'}
                  </button>
                )}
              </div>
              {showAssignUsers ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={handleSearchChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  {isUsersLoading ? (
                    <div className="text-center py-4">
                      <p className="text-gray-500">Loading users...</p>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 max-h-60 overflow-y-auto border border-gray-200 rounded">
                        {usersData?.users?.length > 0 ? (
                          <ul className="divide-y divide-gray-200">
                            {usersData.users.map((user) => (
                              <li key={user.id} className="p-2 hover:bg-gray-100">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedUsers.includes(user.id)}
                                    onChange={() => handleUserSelection(user.id)}
                                    className="h-4 w-4 text-indigo-600"
                                  />
                                  <span>{user.firstName} {user.lastName}</span>
                                </label>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="p-4 text-center text-gray-500">No users found</p>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleAssignUsers}
                          disabled={assignUsersMutation.isLoading}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                        >
                          {assignUsersMutation.isLoading ? 'Saving...' : 'Save Assignments'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg">
                  {guideData.assignedUsers && guideData.assignedUsers.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {guideData.assignedUsers.map((assignment) => (
                        <div key={assignment.userId} className="flex items-center justify-between bg-white p-2 rounded border border-gray-200">
                          <div className="flex items-center">
                            <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                              <span className="text-indigo-800 font-medium">
                                {assignment.user?.firstName?.charAt(0)}{assignment.user?.lastName?.charAt(0)}
                              </span>
                            </div>
                            <span>{assignment.user?.firstName} {assignment.user?.lastName}</span>
                          </div>
                          {hasPermission('production', 'update') && (
                            <button 
                              onClick={() => handleRemoveUser(
                                assignment.userId, 
                                `${assignment.user?.firstName} ${assignment.user?.lastName}`
                              )}
                              className="text-red-500 hover:text-red-700 ml-2"
                              title="Remove user"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No users assigned to this guide</p>
                  )}
                </div>
              )}
            </div>

            {/* Manual Work Entry Form - Add work time directly to the guide */}
            {hasPermission('production', 'work') && (
              <div className="mt-6">
                <h2 className="text-lg font-semibold mb-2">Add Manual Work Time</h2>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target);
                    const stepId = formData.get('stepId');

                    const data = {
                      timeWorked: parseInt(formData.get('durationMinutes')),
                      notes: formData.get('note')
                    };

                    if (!stepId) {
                      toast.error('Please select a step');
                      return;
                    }

                    if (!data.timeWorked || data.timeWorked <= 0) {
                      toast.error('Please enter a valid duration');
                      return;
                    }

                    // Get the current step
                    const selectedStep = guideData.steps.find(step => step.id === stepId);
                    if (!selectedStep) return;
                    
                    // Use the step-specific work entry endpoint
                    productionApi.addWorkEntry(stepId, data)
                      .then(() => {
                        toast.success('Work time recorded successfully');
                        
                        // Calculate the new actual time
                        const newActualTime = (selectedStep.actualTime || 0) + data.timeWorked;
                        
                        // Determine if we need to update the status
                        let newStatus = null;
                        
                        // If pending, always move to in progress
                        if (selectedStep.status === 'PENDING') {
                          newStatus = 'IN_PROGRESS';
                        } 
                        // If in progress and now we've met or exceeded the estimated time, mark as completed
                        else if (selectedStep.status === 'IN_PROGRESS' && 
                                 newActualTime >= selectedStep.estimatedTime) {
                          newStatus = 'COMPLETED';
                        }
                        
                        // If status needs to be updated, do it
                        if (newStatus) {
                          const statusUpdateData = new FormData();
                          statusUpdateData.append('status', newStatus);
                          
                          productionApi.updateStep(stepId, statusUpdateData)
                            .then(() => {
                              if (newStatus === 'COMPLETED') {
                                toast.info(`Step marked as Completed as the required time has been fulfilled.`);
                              } else {
                                toast.info(`Step status updated to ${newStatus}.`);
                              }
                            })
                            .catch(error => {
                              console.error('Error updating step status:', error);
                            });
                        }
                        
                        e.target.reset();
                        queryClient.refetchQueries(['guide', id]);
                      })
                      .catch(err => {
                        // Handle time limit exceeded error
                        if (err.response && err.response.status === 400) {
                          const errorData = err.response.data;
                          
                          if (errorData && 
                              (errorData.message?.includes('time limit') || 
                               errorData.message?.includes('exceeded') ||
                               errorData.message?.includes('Available'))) {
                            // Show specific error message for time limit
                            toast.error(`Time limit exceeded. ${errorData.message}`, {
                              autoClose: 5000, // Longer timeout for this important message
                            });
                            return;
                          }
                        }
                        
                        // Default error handling
                        toast.error(`Error: ${err.message}`);
                      });
                  }}>
                    <div className="mb-3">
                      <label htmlFor="stepId" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Step <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="stepId"
                        name="stepId"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      >
                        <option value="">-- Select a step --</option>
                        {getSortedSteps().map(step => (
                          <option key={step.id} value={step.id}>
                            {step.order}. {step.title} {step.status === 'COMPLETED' ? '(Completed)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="durationMinutes" className="block text-sm font-medium text-gray-700 mb-1">
                        Duration (minutes) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        id="durationMinutes"
                        name="durationMinutes"
                        min="1"
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-1">
                        Note (optional)
                      </label>
                      <textarea
                        id="note"
                        name="note"
                        rows="2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                        placeholder="Describe work performed..."
                      ></textarea>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Record Work Time
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Attachments section */}
            {guideData.attachments && (
              <AttachmentsViewer 
                attachments={guideData.attachments}
                entityType="guide"
                entityId={id}
              />
            )}

            {/* Work Time History */}
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">Work Time History</h2>
              <div className="bg-gray-50 p-4 rounded-lg">
                <WorkTimeHistory 
                  guideId={id}
                  onError={(err) => {
                    console.warn('Work time history error:', err);
                    // Don't show toast to avoid duplicate errors
                  }}
                  onTimeUpdate={() => {
                    // Refetch guide data when time entries are updated
                    queryClient.invalidateQueries(['guide', id]);
                  }}
                  fallbackMessage="No work time records available for this guide."
                />
              </div>
            </div>
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
            {guideData.steps && guideData.steps.length > 0 ? (
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
                              onClick={() => {
                                setSelectedStep(step);
                                setShowStepAssignModal(true);
                              }}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                              title="Assign Users"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 6a3 3 0 100-6 3 3 0 000 6zm8 8a3 3 0 100-6 3 3 0 000 6zm-4-7a1 1 0 10-2 0v1H9a1 1 0 100 2h2v1a1 1 0 102 0v-1h2a1 1 0 100-2h-2V7z" />
                              </svg>
                            </button>
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
      </div>
      
      {/* Render the step assignment modal */}
      {showStepAssignModal && (
        <StepAssignmentModal
          step={selectedStep}
          isOpen={showStepAssignModal}
          onClose={() => setShowStepAssignModal(false)}
        />
      )}
    </MainLayout>
  );
};

export default ProductionGuideDetailsPage;