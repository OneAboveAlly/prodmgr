// frontend-vite/src/pages/ProductionStepDetailsPage.jsx
import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';
import MainLayout from '../components/layout/MainLayout';
import productionApi from '../api/production.api';
import StatusBadge from '../components/production/StatusBadge';
import OCRViewer from '../components/production/OCRViewer';
import WorkEntryList from '../components/production/WorkEntryList';
import StartWorkButton from '../components/production/StartWorkButton';
import StopWorkButton from '../components/production/StopWorkButton';
import ManualWorkEntry from '../components/production/ManualWorkEntry';

const ProductionStepDetailsPage = () => {
  const { id: stepId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
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

  // Fetch step data
  const {
    data: step,
    isLoading: isStepLoading,
    isError: isStepError,
    error: stepError,
    refetch
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

  // Fetch step comments
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

  // Mutations
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
      queryClient.invalidateQueries(['stepComments', stepId]);
    },
    onError: (error) => {
      toast.error(`Error adding comment: ${error.message}`);
    }
  });

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
    formData.append('description', stepFormData.description || '');
    formData.append('estimatedTime', stepFormData.estimatedTime);

    updateStepMutation.mutate(formData);
  };

  const handleDeleteStep = () => {
    if (window.confirm('Are you sure you want to delete this step? This action cannot be undone.')) {
      deleteStepMutation.mutate();
    }
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

    addCommentMutation.mutate(formData);
  };

  // Format date
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleString();
  };

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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <strong className="font-bold">Error:</strong>
            <span className="block">{stepError?.message || 'Failed to load step details.'}</span>
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/production')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Production
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

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <div className="mb-6">
          {step?.guideId ? (
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
          ) : (
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
              Back to Production
            </button>
          )}
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
                  <div className="flex flex-wrap gap-2">
                    {/* Permission-based actions */}
                    {hasPermission('production', 'update') && (
                      <>
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
                      </>
                    )}
                    
                    {/* Status change actions (always visible for users with work permission) */}
                    {hasPermission('production', 'work') && step.status !== 'COMPLETED' && (
                      <button
                        onClick={() => {
                          // Mark step as completed
                          const formData = new FormData();
                          formData.append('status', 'COMPLETED');
                          updateStepMutation.mutate(formData);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Mark Complete
                      </button>
                    )}
                    
                    {/* Allow reopening a completed step */}
                    {hasPermission('production', 'work') && step.status === 'COMPLETED' && (
                      <button
                        onClick={() => {
                          const formData = new FormData();
                          formData.append('status', 'IN_PROGRESS');
                          updateStepMutation.mutate(formData);
                        }}
                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded"
                      >
                        Ponów krok
                      </button>
                    )}
                  </div>
                </div>

                {step.description && (
                  <div className="mt-4">
                    <h2 className="text-lg font-semibold mb-2">Opis</h2>
                    <p className="text-gray-700 whitespace-pre-line">{step.description}</p>
                  </div>
                )}

                {/* OCR Text if available */}
                {step.ocrText && (
                  <OCRViewer stepId={stepId} ocrText={step.ocrText} />
                )}

                {/* Work control buttons */}
                {hasPermission('production', 'work') && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-3">Work Actions</h2>
                    <div className="flex flex-wrap gap-3">
                      <StartWorkButton step={step} />
                      <StopWorkButton step={step} />
                      
                      {/* Additional work actions can be added here */}
                      {step.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => {
                            // Pause work
                            const formData = new FormData();
                            formData.append('status', 'PENDING');
                            updateStepMutation.mutate(formData);
                          }}
                          className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded"
                        >
                          Pause Step
                        </button>
                      )}
                      
                      {step.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            // Resume work
                            const formData = new FormData();
                            formData.append('status', 'IN_PROGRESS');
                            updateStepMutation.mutate(formData);
                          }}
                          className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
                        >
                          Resume Step
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual Work Entry Form */}
                {hasPermission('production', 'work') && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-3">Record Work Time</h2>
                    <ManualWorkEntry stepId={stepId} />
                  </div>
                )}

                {/* Work Entry List - shows user work sessions */}
                <div className="mt-6">
                  <h2 className="text-lg font-semibold mb-3">Work History</h2>
                  <WorkEntryList stepId={stepId} />
                </div>

                {/* Step metadata */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">Created Info</h2>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm">
                        <span className="font-medium">Created:</span> {formatDateTime(step.createdAt)}
                      </p>
                      <p className="text-sm mt-1">
                        <span className="font-medium">Last Updated:</span> {formatDateTime(step.updatedAt)}
                      </p>
                      {step.guide && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Guide:</span> {step.guide.title}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Comments section */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Comments</h2>

            {/* Add comment form */}
            {hasPermission('production', 'work') && (
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
            )}

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
                            {comment.user?.firstName?.charAt(0)}{comment.user?.lastName?.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {comment.user?.firstName} {comment.user?.lastName}
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
                              href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/uploads/${attachment.filename}`}
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
                              {attachment.filename || 'Attachment'}
                            </a>
                          ))}
                        </div>
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