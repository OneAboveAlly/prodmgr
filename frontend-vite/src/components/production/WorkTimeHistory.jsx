// frontend-vite/src/components/production/WorkTimeHistory.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';
import { useAuth } from '../../contexts/AuthContext';
import CollapsibleNote from '../common/CollapsibleNote';

// Time Entry Edit Modal component
const EditTimeEntryModal = ({ entry, isOpen, onClose, onSave }) => {
  const [timeWorked, setTimeWorked] = useState(entry.timeWorked || entry.durationMinutes || 0);
  const [notes, setNotes] = useState(entry.notes || entry.note || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  if (!isOpen) return null;
  
  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    onSave({ 
      id: entry.id, 
      timeWorked: parseInt(timeWorked), 
      notes 
    }).finally(() => setIsSubmitting(false));
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg w-full max-w-md">
        <h3 className="text-lg font-medium mb-4">Edit Time Entry</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="timeWorked" className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="timeWorked"
              value={timeWorked}
              onChange={(e) => setTimeWorked(e.target.value)}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            ></textarea>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WorkTimeHistory = ({ guideId, stepId, onError, onTimeUpdate, fallbackMessage = "No work time entries found." }) => {
  const { hasPermission } = useAuth();
  const [editingEntry, setEditingEntry] = useState(null);
  const queryClient = useQueryClient();
  
  // Use the fixed API endpoint from productionApi
  const { 
    data,
    isLoading,
    isError, 
    error 
  } = useQuery({
    queryKey: ['guideWorkEntries', guideId, stepId],
    queryFn: () => stepId 
      ? productionApi.getStepWorkEntries(stepId)
      : productionApi.getGuideWorkEntries(guideId),
    onError: (err) => {
      console.error('Work time history fetch error:', err);
      if (onError) onError(err);
    }
  });

  // Update time entry mutation
  const updateTimeMutation = useMutation({
    mutationFn: (data) => productionApi.updateWorkEntry(data.id, {
      timeWorked: data.timeWorked,
      notes: data.notes
    }),
    onSuccess: () => {
      toast.success("Time entry updated successfully");
      setEditingEntry(null);
      // Refresh the data
      queryClient.invalidateQueries(['guideWorkEntries', guideId, stepId]);
      // Notify parent of the update
      if (onTimeUpdate) onTimeUpdate();
    },
    onError: (error) => {
      toast.error(`Error updating time entry: ${error.message}`);
    }
  });

  const handleEditTimeEntry = (entry) => {
    setEditingEntry(entry);
  };

  const handleSaveTimeEntry = (data) => {
    return updateTimeMutation.mutateAsync(data);
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading work time history...</div>;
  }

  if (isError) {
    return (
      <div className="text-center py-4 text-red-500">
        {fallbackMessage}
      </div>
    );
  }

  const entries = data?.entries || [];
  const userTotals = data?.userTotals || [];
  
  if (entries.length === 0) {
    return <div className="text-center py-4 text-gray-500">{fallbackMessage}</div>;
  }

  // Group entries by step for better organization
  const entriesByStep = entries.reduce((acc, entry) => {
    const stepId = entry.stepId;
    if (!acc[stepId]) {
      acc[stepId] = [];
    }
    acc[stepId].push(entry);
    return acc;
  }, {});

  return (
    <div className="work-time-history">
      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium">Total time logged: {data.totalTime || 0} minutes</h3>
          
          {data.estimatedTotal && (
            <div className="mt-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm text-gray-700">Progress: {Math.round((data.totalTime / data.estimatedTotal) * 100)}%</span>
                <span className="text-sm text-gray-700">{data.totalTime}/{data.estimatedTotal} min</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, (data.totalTime / data.estimatedTotal) * 100)}%` }}></div>
              </div>
            </div>
          )}
        </div>
        
        {userTotals.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-2">Time by user</h3>
            <div className="flex flex-wrap gap-2">
              {userTotals.map(user => (
                <div key={user.userId} className="bg-gray-100 px-3 py-1 rounded-full text-sm">
                  {user.firstName} {user.lastName}: {user.totalTime} min
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
              {hasPermission('production', 'manage') && (
                <th scope="col" className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {new Date(entry.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {entry.user?.firstName} {entry.user?.lastName}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {entry.step?.title || '-'}
                  </div>
                  {entry.step?.order !== undefined && (
                    <div className="text-xs text-gray-500">Step {entry.step.order}</div>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                  {entry.timeWorked || entry.durationMinutes} min
                </td>
                <td className="px-3 py-2 text-sm">
                  <CollapsibleNote text={entry.notes || entry.note} />
                </td>
                {hasPermission('production', 'manage') && (
                  <td className="px-3 py-2 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEditTimeEntry(entry)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {editingEntry && (
        <EditTimeEntryModal
          entry={editingEntry}
          isOpen={!!editingEntry}
          onClose={() => setEditingEntry(null)}
          onSave={handleSaveTimeEntry}
        />
      )}
    </div>
  );
};

export default WorkTimeHistory;