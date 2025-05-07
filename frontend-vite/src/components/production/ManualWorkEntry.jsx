// frontend-vite/src/components/production/ManualWorkEntry.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import productionApi from '../../api/production.api';

const ManualWorkEntry = ({ stepId }) => {
  const [timeWorked, setTimeWorked] = useState('');
  const [notes, setNotes] = useState('');
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const addWorkEntryMutation = useMutation({
    mutationFn: (data) => productionApi.addWorkEntry(stepId, data),
    onSuccess: () => {
      toast.success('Czas pracy zapisany pomyślnie!');
      queryClient.invalidateQueries(['stepWorkEntries', stepId]);
      queryClient.invalidateQueries(['step', stepId]);
      setTimeWorked('');
      setNotes('');
      setShowForm(false);
    },
    onError: (error) => {
      toast.error(`Błąd zapisywania czasu pracy: ${error.message}`);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate input
    const time = parseInt(timeWorked);
    if (isNaN(time) || time <= 0) {
      toast.error('Wprowadź poprawną dodatnią wartość czasu pracy');
      return;
    }
    
    addWorkEntryMutation.mutate({
      timeWorked: time,
      notes
    });
  };

  if (!showForm) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setShowForm(true)}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center"
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
              d="M12 6v6m0 0v6m0-6h6m-6 0H6" 
            />
          </svg>
          Dodaj ręczny wpis czasu pracy
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
      <h4 className="font-medium mb-3">Dodaj ręczny czas pracy</h4>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="timeWorked" className="block text-sm font-medium text-gray-700 mb-1">
            Przepracowany czas (minuty) <span className="text-red-500">*</span>
          </label>
          <input
            id="timeWorked"
            type="number"
            value={timeWorked}
            onChange={(e) => setTimeWorked(e.target.value)}
            min="1"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            placeholder="Wprowadź czas w minutach"
          />
        </div>
        <div className="mb-3">
          <label htmlFor="workNotes" className="block text-sm font-medium text-gray-700 mb-1">
            Notatki (opcjonalnie)
          </label>
          <textarea
            id="workNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            rows="2"
            placeholder="Opisz wykonaną pracę..."
          ></textarea>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-gray-800"
          >
            Anuluj
          </button>
          <button
            type="submit"
            disabled={addWorkEntryMutation.isLoading}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
          >
            {addWorkEntryMutation.isLoading ? 'Zapisywanie...' : 'Dodaj czas pracy'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ManualWorkEntry;