import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';

const StopWorkButton = ({ step }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const stopWorkMutation = useMutation({
    mutationFn: ({ stepId, notes }) => productionApi.endWorkOnStep(stepId, notes),
    onSuccess: () => {
      toast.success('Work completed successfully!');
      queryClient.invalidateQueries(['guide']);
      queryClient.invalidateQueries(['step', step.id]);
      queryClient.invalidateQueries(['workEntries', step.id]);
      setShowConfirm(false);
      setNotes('');
    },
    onError: (error) => {
      toast.error(`Error completing work: ${error.message}`);
    }
  });

  // Determine if button should be disabled
  const isDisabled = 
    stopWorkMutation.isLoading || 
    step.status !== 'in_progress';

  const handleSubmit = (e) => {
    e.preventDefault();
    stopWorkMutation.mutate({ stepId: step.id, notes });
  };

  if (showConfirm) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium mb-2">Complete Work</h4>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              rows="2"
              placeholder="Describe what was completed..."
            ></textarea>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={stopWorkMutation.isLoading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              {stopWorkMutation.isLoading ? 'Saving...' : 'Complete Work'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowConfirm(true)}
      disabled={isDisabled}
      className={`flex items-center px-4 py-2 rounded text-white font-medium ${
        isDisabled 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
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
          d="M5 13l4 4L19 7" 
        />
      </svg>
      Complete Work
    </button>
  );
};

export default StopWorkButton;
