// frontend-vite/src/components/production/StopWorkButton.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';

const StopWorkButton = ({ step }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [completeStep, setCompleteStep] = useState(false);

  const stopWorkMutation = useMutation({
    mutationFn: ({ stepId, notes, completeStep }) => 
      productionApi.endWorkOnStep(stepId, { notes, completeStep }),
    onSuccess: () => {
      toast.success('Praca zakończona pomyślnie!');
      queryClient.invalidateQueries(['guide']);
      queryClient.invalidateQueries(['step', step.id]);
      queryClient.invalidateQueries(['stepWorkEntries', step.id]);
      setShowConfirm(false);
      setNotes('');
      setCompleteStep(false);
    },
    onError: (error) => {
      toast.error(`Błąd zakończenia pracy: ${error.message}`);
    }
  });

  // Normalize step status to handle case differences
  const normalizedStatus = step?.status?.toUpperCase() || '';
  
  // Determine if button should be disabled
  const isDisabled = 
    stopWorkMutation.isLoading || 
    normalizedStatus !== 'IN_PROGRESS';

  const handleSubmit = (e) => {
    e.preventDefault();
    stopWorkMutation.mutate({ 
      stepId: step.id, 
      notes,
      completeStep
    });
  };

  if (showConfirm) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="font-medium mb-2">Zakończ pracę</h4>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notatki (opcjonalnie)
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
              rows="2"
              placeholder="Opisz co zostało wykonane..."
            ></textarea>
          </div>
          <div className="mb-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={completeStep}
                onChange={(e) => setCompleteStep(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Oznacz krok jako ukończony</span>
            </label>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
            >
              Anuluj
            </button>
            <button
              type="submit"
              disabled={stopWorkMutation.isLoading}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white"
            >
              {stopWorkMutation.isLoading ? 'Zapisywanie...' : 'Zakończ pracę'}
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
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
        />
      </svg>
      Zakończ pracę
    </button>
  );
};

export default StopWorkButton;