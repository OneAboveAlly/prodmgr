import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import productionApi from '../api/production.api';
import StatusBadge from '../components/production/StatusBadge';
import OCRViewer from '../components/production/OCRViewer';
import ChangeHistoryPanel from '../components/production/ChangeHistoryPanel';
import WorkEntryList from '../components/production/WorkEntryList';
import StartWorkButton from '../components/production/StartWorkButton';
import StopWorkButton from '../components/production/StopWorkButton';

const ProductionStepDetailsPage = () => {
  const { id: stepId } = useParams();
  const navigate = useNavigate();
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();

  // State
  const [showEditForm, setShowEditForm] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentFiles, setCommentFiles] = useState([]);
  const [stepFormData, setStepFormData] = useState({
    title: '',
    description: '',
    estimatedTime: 0
  });

  // NEW: Comment notification states
  const [selectedNotifyUserIds, setSelectedNotifyUserIds] = useState([]);
  const [sendEmailNotification, setSendEmailNotification] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [commentUserSearchTerm, setCommentUserSearchTerm] = useState('');

  // User assignment states
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToRemove, setUserToRemove] = useState(null);
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState(''); // New state for notification message

  // Queries
  const {
    data: step,
    isLoading: isStepLoading,
    isError: isStepError,
    error: stepError
  } = useQuery({
    queryKey: ['step', stepId],
    queryFn: () => productionApi.getStepById(stepId),
    onSuccess: (data) => {
      setStepFormData({
        title: data.title || '',
        description: data.description || '',
        estimatedTime: data.estimatedTime || 0
      });
    },
    onError: (error) => {
      toast.error(`Error loading step: ${error.message}`);
    }
  });

  const {
    data: comments,
    isLoading: isCommentsLoading
  } = useQuery({
    queryKey: ['stepComments', stepId],
    queryFn: () => productionApi.getStepComments(stepId),
    onError: (error) => {
      toast.error(`Error loading comments: ${error.message}`);
    }
  });

  const {
    data: assignedUsers,
    isLoading: isUsersLoading,
    refetch: refetchAssignedUsers
  } = useQuery({
    queryKey: ['stepAssignedUsers', stepId],
    queryFn: () => productionApi.getAssignedUsers(stepId),
    onError: (error) => {
      toast.error(`Error loading assigned users: ${error.message}`);
    }
  });

  const {
    data: allUsers,
    isLoading: isAllUsersLoading
  } = useQuery({
    queryKey: ['allUsers', searchTerm],
    queryFn: () => productionApi.getAllUsers({
      search: searchTerm,
      limit: 50,
      active: true
    }),
    enabled: showAssignForm, // Only fetch when assignment form is shown
    onError: (error) => {
      toast.error(`Error loading users: ${error.message}`);
    }
  });

  // Additional query for comment notifications - use separate search term
  const {
    data: commentNotifyUsers,
    isLoading: isCommentUsersLoading
  } = useQuery({
    queryKey: ['commentNotifyUsers', commentUserSearchTerm],
    queryFn: () => productionApi.getAllUsers({
      search: commentUserSearchTerm,
      limit: 50,
      active: true
    }),
    enabled: showUserSelection, // Only fetch when user selection is displayed
    onError: (error) => {
      toast.error(`Error loading users: ${error.message}`);
    }
  });

  // Mutations
  const startWorkMutation = useMutation({
    mutationFn: () => productionApi.startWorkOnStep(stepId),
    onSuccess: () => {
      toast.success('Work started successfully!');
      queryClient.invalidateQueries(['step', stepId]);
    },
    onError: (error) => {
      toast.error(`Error starting work: ${error.message}`);
    }
  });

  const endWorkMutation = useMutation({
    mutationFn: () => productionApi.endWorkOnStep(stepId),
    onSuccess: () => {
      toast.success('Work completed successfully!');
      queryClient.invalidateQueries(['step', stepId]);
    },
    onError: (error) => {
      toast.error(`Error completing work: ${error.message}`);
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: (formData) => productionApi.updateStep(stepId, formData),
    onSuccess: () => {
      toast.success('Step updated successfully!');
      queryClient.invalidateQueries(['step', stepId]);
      setShowEditForm(false);
    },
    onError: (error) => {
      toast.error(`Error updating step: ${error.message}`);
    }
  });

  const deleteStepMutation = useMutation({
    mutationFn: () => productionApi.deleteStep(stepId),
    onSuccess: () => {
      toast.success('Step deleted successfully!');
      // Navigate back to the guide
      if (step?.guideId) {
        navigate(`/production/guides/${step.guideId}`);
      } else {
        navigate('/production');
      }
    },
    onError: (error) => {
      toast.error(`Error deleting step: ${error.message}`);
    }
  });

  const addCommentMutation = useMutation({
    mutationFn: (formData) => productionApi.addStepComment(stepId, formData),
    onSuccess: () => {
      toast.success('Comment added successfully!');
      setCommentText('');
      setCommentFiles([]);
      setSelectedNotifyUserIds([]);
      setSendEmailNotification(false);
      setShowUserSelection(false);
      queryClient.invalidateQueries(['stepComments', stepId]);
    },
    onError: (error) => {
      toast.error(`Error adding comment: ${error.message}`);
    }
  });

  // User assignment mutation
  const assignUsersMutation = useMutation({
    mutationFn: (data) => productionApi.assignUsersToStep(
      stepId, 
      data.userIds, 
      true, 
      { 
        notifyMessage: data.notifyMessage,
        notifyUsers: data.userIds 
      }
    ),
    onSuccess: (_, variables) => {
      toast.success('Users assigned successfully!');
      // Log the assignment event
      console.log('Assigned users with IDs:', variables.userIds, 'Message:', variables.notifyMessage);
      
      // If we have the actual user objects, log their names too
      if (allUsers && allUsers.users) {
        const assignedUserObjects = allUsers.users.filter(user => variables.userIds.includes(user.id));
        const userNames = assignedUserObjects.map(user => `${user.firstName} ${user.lastName}`).join(', ');
        console.log('Assigned users:', userNames);
      }
      
      refetchAssignedUsers();
      setShowAssignForm(false);
      setSelectedUserIds([]);
      setNotificationMessage('');
    },
    onError: (error) => {
      toast.error(`Error assigning users: ${error.message}`);
    }
  });

  // User removal mutation
  const removeUserMutation = useMutation({
    mutationFn: (userId) => productionApi.removeUserFromStep(stepId, userId),
    onSuccess: () => {
      toast.success('User removed successfully!');
      refetchAssignedUsers();
      setShowRemoveConfirmation(false);
      setUserToRemove(null);
    },
    onError: (error) => {
      toast.error(`Error removing user: ${error.message}`);
      setShowRemoveConfirmation(false);
      setUserToRemove(null);
    }
  });

  // Set initial selected users when the assigned users data is loaded
  useEffect(() => {
    if (assignedUsers && assignedUsers.length > 0) {
      setSelectedUserIds(assignedUsers.map(user => user.id));
    }
  }, [assignedUsers]);

  // Handlers
  const handleStepFormChange = (e) => {
    const { name, value } = e.target;
    setStepFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedTime' ? Number(value) : value
    }));
  };

  const handleUpdateStep = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', stepFormData.title);
    formData.append('description', stepFormData.description);
    formData.append('estimatedTime', stepFormData.estimatedTime);

    updateStepMutation.mutate(formData);
  };

  const handleDeleteStep = () => {
    if (window.confirm('Are you sure you want to delete this step? This action cannot be undone.')) {
      deleteStepMutation.mutate();
    }
  };

  const handleStartWork = () => {
    startWorkMutation.mutate();
  };

  const handleEndWork = () => {
    endWorkMutation.mutate();
  };

  const handleCommentFileChange = (e) => {
    setCommentFiles(Array.from(e.target.files));
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();

    if (!commentText.trim() && commentFiles.length === 0) {
      toast.error('Please add a comment or attach a file.');
      return;
    }

    const formData = new FormData();
    formData.append('content', commentText);

    // Append files if any
    commentFiles.forEach(file => {
      formData.append('attachments', file);
    });

    // Add notification details if users are selected
    if (selectedNotifyUserIds.length > 0) {
      formData.append('notify', true);
      formData.append('notifyRecipients', JSON.stringify(selectedNotifyUserIds));
      formData.append('notifyByEmail', sendEmailNotification);
    }

    addCommentMutation.mutate(formData);
  };

  // Handle toggle for user selection in comment form
  const toggleUserSelectionPanel = () => {
    setShowUserSelection(!showUserSelection);
    if (!showUserSelection) {
      setCommentUserSearchTerm('');
    }
  };

  // Handle search for users in comment notification
  const handleCommentUserSearch = (e) => {
    setCommentUserSearchTerm(e.target.value);
  };

  // Handle user selection for notifications
  const handleNotifyUserSelection = (userId) => {
    setSelectedNotifyUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  // User assignment handlers
  const handleOpenAssignForm = () => {
    setShowAssignForm(true);
    setNotificationMessage('');
  };

  const handleCloseAssignForm = () => {
    setShowAssignForm(false);
    setSelectedUserIds(assignedUsers ? assignedUsers.map(user => user.id) : []);
    setNotificationMessage('');
  };

  const handleUserSelection = (userId) => {
    setSelectedUserIds(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };

  const handleAssignUsers = (e) => {
    e.preventDefault();
    assignUsersMutation.mutate({
      userIds: selectedUserIds,
      notifyMessage: notificationMessage
    });
  };

  const handleSearchUsers = (e) => {
    setSearchTerm(e.target.value);
  };

  // User removal handlers
  const openRemoveConfirmation = (user) => {
    setUserToRemove(user);
    setShowRemoveConfirmation(true);
  };

  const closeRemoveConfirmation = () => {
    setShowRemoveConfirmation(false);
    setUserToRemove(null);
  };

  const handleRemoveUser = () => {
    if (userToRemove) {
      removeUserMutation.mutate(userToRemove.id);
    }
  };

  // Get filtered users for comment notifications
  const filteredCommentUsers = commentNotifyUsers?.users || [];

  // Get selected users names for display
  const getSelectedUserNames = () => {
    if (!commentNotifyUsers?.users || selectedNotifyUserIds.length === 0) return [];
    
    return commentNotifyUsers.users
      .filter(user => selectedNotifyUserIds.includes(user.id))
      .map(user => `${user.firstName} ${user.lastName}`);
  };
  
  const selectedUserNames = getSelectedUserNames();

  // Loading state
  if (isStepLoading) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="text-gray-600 text-lg">Loading step details...</div>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Error state
  if (isStepError) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong className="font-bold">Error:</strong>
            <span className="block">{stepError?.message || 'Failed to load step details.'}</span>
          </div>
          <div className="mt-4">
            <button
              onClick={() => navigate('/production')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Production
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Filter users for assignment dropdown
  const filteredUsers = allUsers?.users || [];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          <Link
            to={`/production/guides/${step.guideId}`}
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
            Back to Guide
          </Link>
        </div>

        {/* Step details */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            {showEditForm ? (
              // Edit form
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Edit Step</h2>
                <form onSubmit={handleUpdateStep}>
                  <div className="mb-4">
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
                      onClick={() => setShowEditForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      disabled={updateStepMutation.isLoading}
                    >
                      {updateStepMutation.isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              // Step details view
              <>
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h1>
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                      <StatusBadge status={step.status} />
                      <span className="text-sm text-gray-500">
                        Order: {step.order}
                      </span>
                      {step.estimatedTime > 0 && (
                        <span className="text-sm text-gray-500">
                          Est. Time: {step.estimatedTime} min
                        </span>
                      )}
                      {step.actualTime > 0 && (
                        <span className="text-sm text-gray-500">
                          Actual Time: {step.actualTime} min
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {hasPermission('production', 'update') && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowEditForm(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Edit Step
                      </button>
                      <button
                        onClick={handleDeleteStep}
                        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                        disabled={deleteStepMutation.isLoading}
                      >
                        {deleteStepMutation.isLoading ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </div>

                {step.description && (
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">Description</h2>
                    <p className="text-gray-700 whitespace-pre-line">{step.description}</p>
                  </div>
                )}

                {/* OCR Text if available */}
                {step.ocrText && (
                  <OCRViewer stepId={stepId} ocrText={step.ocrText} />
                )}

                {/* Work control buttons */}
                {hasPermission('production', 'update') && (
                  <div className="mt-6 flex space-x-3">
                    <StartWorkButton step={step} />
                    <StopWorkButton step={step} />
                  </div>
                )}

                {/* Change History Panel */}
                <ChangeHistoryPanel stepId={stepId} />

                {/* Work Entry List - shows user work sessions */}
                <WorkEntryList stepId={stepId} />

                {/* Creator and assigned users info */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Created By</h2>
                    <div className="flex items-center">
                      {step.createdBy ? (
                        <div>
                          <p className="text-gray-700">{step.createdBy.firstName} {step.createdBy.lastName}</p>
                          <p className="text-sm text-gray-500">{new Date(step.createdAt).toLocaleDateString()}</p>
                        </div>
                      ) : (
                        <p className="text-gray-500">Information not available</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <h2 className="text-lg font-semibold">Assigned Users</h2>
                      {hasPermission('production', 'update') && (
                        <button
                          onClick={handleOpenAssignForm}
                          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                        >
                          Assign Users
                        </button>
                      )}
                    </div>
                    {isUsersLoading ? (
                      <p className="text-gray-500">Loading assigned users...</p>
                    ) : assignedUsers && assignedUsers.length > 0 ? (
                      <ul className="space-y-2">
                        {assignedUsers.map(user => (
                          <li key={user.id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                                <span className="text-sm font-semibold">
                                  {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                </span>
                              </div>
                              <span>{user.firstName} {user.lastName}</span>
                            </div>
                            {hasPermission('production', 'update') && (
                              <button
                                onClick={() => openRemoveConfirmation(user)}
                                className="text-gray-400 hover:text-red-500"
                                title="Remove user"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500">No users assigned to this step</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* User Assignment Modal */}
        {showAssignForm && (
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                        Assign Users to Step
                      </h3>

                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={handleSearchUsers}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>

                      {isAllUsersLoading ? (
                        <div className="py-4 text-center">
                          <p className="text-gray-500">Loading users...</p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-md">
                          {filteredUsers.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                              {filteredUsers.map(user => (
                                <li key={user.id} className="p-3 hover:bg-gray-50">
                                  <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedUserIds.includes(user.id)}
                                      onChange={() => handleUserSelection(user.id)}
                                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <div className="flex items-center">
                                      <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                                        <span className="text-sm font-semibold">
                                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                        </span>
                                      </div>
                                      <span>{user.firstName} {user.lastName}</span>
                                    </div>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="p-4 text-center text-gray-500">No users found</p>
                          )}
                        </div>
                      )}

                      <div className="mt-4">
                        <p className="text-sm text-gray-500">
                          Selected users: {selectedUserIds.length}
                        </p>
                      </div>

                      {/* New notification message field */}
                      <div className="mt-4">
                        <label htmlFor="notificationMessage" className="block text-sm font-medium text-gray-700 mb-1">
                          Notification message (optional)
                        </label>
                        <textarea
                          id="notificationMessage"
                          value={notificationMessage}
                          onChange={(e) => setNotificationMessage(e.target.value)}
                          rows="3"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter a notification message to send to assigned users..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="button"
                    onClick={handleAssignUsers}
                    disabled={assignUsersMutation.isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {assignUsersMutation.isLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseAssignForm}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Removal Confirmation Modal */}
        {showRemoveConfirmation && userToRemove && (
          <div className="fixed inset-0 z-10 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                      <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Remove User
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Are you sure you want to remove {userToRemove.firstName} {userToRemove.lastName} from this step?
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button 
                    type="button" 
                    onClick={handleRemoveUser}
                    disabled={removeUserMutation.isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    {removeUserMutation.isLoading ? 'Removing...' : 'Remove'}
                  </button>
                  <button 
                    type="button" 
                    onClick={closeRemoveConfirmation}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Comments section */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Comments</h2>

            {/* Add comment form */}
            <div className="mb-8">
              <form onSubmit={handleSubmitComment}>
                <div className="mb-4">
                  <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                    Add a Comment
                  </label>
                  <textarea
                    id="comment"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Write your comment here..."
                  ></textarea>
                </div>
                
                <div className="mb-4">
                  <label htmlFor="attachments" className="block text-sm font-medium text-gray-700 mb-1">
                    Attachments (optional)
                  </label>
                  <input
                    type="file"
                    id="attachments"
                    multiple
                    onChange={handleCommentFileChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  {commentFiles.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">Selected files:</p>
                      <ul className="list-disc pl-5 mt-1 text-sm text-gray-600">
                        {commentFiles.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Notification section */}
                <div className="mb-4 border-t border-gray-200 pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">Notification options</span>
                    <button
                      type="button"
                      onClick={toggleUserSelectionPanel}
                      className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                    >
                      {showUserSelection ? 'Hide user selection' : 'Select users to notify'}
                    </button>
                  </div>
                  
                  {/* Selected users summary */}
                  {selectedNotifyUserIds.length > 0 && (
                    <div className="mb-3 bg-gray-50 p-2 rounded">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {selectedNotifyUserIds.length} user{selectedNotifyUserIds.length !== 1 ? 's' : ''} will be notified
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedNotifyUserIds([])}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Clear all
                        </button>
                      </div>
                      {selectedUserNames.length > 0 && (
                        <div className="mt-1 text-xs text-gray-500">
                          {selectedUserNames.join(', ')}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* User selection panel */}
                  {showUserSelection && (
                    <div className="mb-4 border border-gray-200 rounded-lg p-3">
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={commentUserSearchTerm}
                          onChange={handleCommentUserSearch}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      
                      {isCommentUsersLoading ? (
                        <div className="py-2 text-center">
                          <p className="text-sm text-gray-500">Loading users...</p>
                        </div>
                      ) : (
                        <div className="max-h-60 overflow-y-auto">
                          {filteredCommentUsers.length > 0 ? (
                            <ul className="divide-y divide-gray-200">
                              {filteredCommentUsers.map(user => (
                                <li key={user.id} className="py-2 hover:bg-gray-50">
                                  <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={selectedNotifyUserIds.includes(user.id)}
                                      onChange={() => handleNotifyUserSelection(user.id)}
                                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <div className="flex items-center">
                                      <div className="bg-gray-200 rounded-full w-7 h-7 flex items-center justify-center mr-2">
                                        <span className="text-xs font-semibold">
                                          {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                        </span>
                                      </div>
                                      <span className="text-sm">{user.firstName} {user.lastName}</span>
                                    </div>
                                  </label>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="py-2 text-center text-sm text-gray-500">No users found</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Email notification option */}
                  <div className="flex items-center mt-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendEmailNotification}
                      onChange={() => setSendEmailNotification(!sendEmailNotification)}
                      className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      disabled={selectedNotifyUserIds.length === 0}
                    />
                    <label htmlFor="sendEmail" className="ml-2 text-sm text-gray-700">
                      Also send email notification
                      {selectedNotifyUserIds.length === 0 && (
                        <span className="text-gray-400"> (select users first)</span>
                      )}
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={addCommentMutation.isLoading}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {addCommentMutation.isLoading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            </div>

            {/* Comments list */}
            <div className="space-y-6">
              {isCommentsLoading ? (
                <div className="text-center py-4">
                  <p className="text-gray-500">Loading comments...</p>
                </div>
              ) : comments && comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-0">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center mr-2">
                          <span className="text-sm font-semibold">
                            {comment.user.firstName.charAt(0)}{comment.user.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {comment.user.firstName} {comment.user.lastName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(comment.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-gray-700 whitespace-pre-line ml-10">
                      {comment.content}
                    </div>

                    {/* Comment attachments */}
                    {comment.attachments && comment.attachments.length > 0 && (
                      <div className="mt-2 ml-10">
                        <p className="text-sm font-medium text-gray-700">Attachments:</p>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {comment.attachments.map((attachment) => (
                            <a
                              key={attachment.id}
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-md text-sm text-gray-700"
                            >
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                                />
                              </svg>
                              {attachment.fileName || 'Attachment'}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Display notified users if any */}
                    {comment.notifiedUsers && comment.notifiedUsers.length > 0 && (
                      <div className="mt-2 ml-10 text-xs text-gray-500">
                        <span className="font-medium">Notified:</span> {comment.notifiedUsers.map(u => `${u.firstName} ${u.lastName}`).join(', ')}
                        {comment.emailNotificationSent && <span className="italic"> (email sent)</span>}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No comments yet.</p>
                  <p className="text-gray-500 mt-1">Be the first to add a comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProductionStepDetailsPage;