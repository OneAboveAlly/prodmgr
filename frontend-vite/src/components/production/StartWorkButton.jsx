// frontend-vite/src/components/production/StartWorkButton.jsx
import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';

const StartWorkButton = ({ step }) => {
  const queryClient = useQueryClient();

  const startWorkMutation = useMutation({
    mutationFn: (stepId) => productionApi.startWorkOnStep(stepId),
    onSuccess: () => {
      toast.success('Praca rozpoczęta pomyślnie!');
      queryClient.invalidateQueries(['guide']);
      queryClient.invalidateQueries(['step', step.id]);
    },
    onError: (error) => {
      toast.error(`Błąd rozpoczynania pracy: ${error.message}`);
    }
  });

  // Check step status - normalize status values to handle case differences
  const normalizedStatus = step?.status?.toUpperCase() || '';
  
  // Determine if button should be disabled
  const isDisabled = 
    startWorkMutation.isLoading || 
    normalizedStatus === 'COMPLETED' || 
    normalizedStatus === 'IN_PROGRESS';

  const handleClick = () => {
    if (!isDisabled) {
      startWorkMutation.mutate(step.id);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`flex items-center px-4 py-2 rounded text-white font-medium ${
        isDisabled 
          ? 'bg-gray-400 cursor-not-allowed' 
          : 'bg-green-600 hover:bg-green-700'
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
          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
        />
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      {startWorkMutation.isLoading ? 'Rozpoczynanie...' : 'Rozpocznij pracę'}
    </button>
  );
};

export default StartWorkButton;