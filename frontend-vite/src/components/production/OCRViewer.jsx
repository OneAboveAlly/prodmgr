import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import productionApi from '../../api/production.api';

const OCRViewer = ({ stepId, ocrText }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(ocrText);
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();

  const updateOCRTextMutation = useMutation({
    mutationFn: ({ stepId, text }) => productionApi.updateStepOCRText(stepId, text),
    onSuccess: () => {
      toast.success('OCR text updated successfully!');
      queryClient.invalidateQueries(['guide']);
      setIsEditing(false);
    },
    onError: (error) => {
      toast.error(`Error updating OCR text: ${error.message}`);
    }
  });

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setEditedText(ocrText);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    updateOCRTextMutation.mutate({ stepId, text: editedText });
  };

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold">OCR Text</h3>
        {hasPermission('production', 'update') && (
          <button
            onClick={handleEditToggle}
            className="text-indigo-600 hover:text-indigo-900 text-sm"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>
      
      {isEditing ? (
        <div>
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full border border-gray-300 rounded-md shadow-sm p-2 mb-3"
            rows="10"
          ></textarea>
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              disabled={updateOCRTextMutation.isLoading}
            >
              {updateOCRTextMutation.isLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded whitespace-pre-line text-gray-700 text-sm">
          {ocrText}
        </div>
      )}
    </div>
  );
};

export default OCRViewer;
