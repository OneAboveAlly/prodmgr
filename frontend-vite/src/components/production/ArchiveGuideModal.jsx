import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Modal from '../../components/common/Modal';
import Textarea from '../../components/common/Textarea';
import { Archive, AlertTriangle } from 'lucide-react';
import { archiveGuide } from '../../utils/guideArchiveUtils';

const ArchiveGuideModal = ({ guide, onClose }) => {
  const [reason, setReason] = useState('');
  const queryClient = useQueryClient();
  
  const mutation = useMutation({
    mutationFn: () => archiveGuide(guide.id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['productionGuide', guide.id]);
      queryClient.invalidateQueries(['productionGuides']);
      onClose();
    }
  });
  
  // Check if guide has active steps
  const hasActiveSteps = guide.steps && guide.steps.some(step => step.status === 'IN_PROGRESS');
  
  return (
    <Modal 
      title={(
        <div className="flex items-center">
          <Archive className="mr-2 text-gray-600" size={20} />
          Archive Production Guide
        </div>
      )} 
      onClose={onClose}
    >
      <div className="space-y-4">
        <p>
          You are about to archive guide: <strong>{guide.title}</strong>
        </p>
        
        <div className="bg-amber-50 p-3 rounded border border-amber-200">
          <p className="flex items-start">
            <AlertTriangle className="text-amber-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
            <span>
              Archiving this guide will remove it from the active guides list. Archived guides can be viewed in 
              the archives section and can be restored if needed.
            </span>
          </p>
        </div>
        
        {hasActiveSteps && (
          <div className="bg-red-50 p-3 rounded border border-red-200">
            <p className="flex items-start">
              <AlertTriangle className="text-red-600 mr-2 mt-0.5 flex-shrink-0" size={16} />
              <span>
                <strong>Warning:</strong> This guide has steps that are still in progress. 
                Archiving this guide might disrupt ongoing work.
              </span>
            </p>
          </div>
        )}
        
        <Textarea
          label="Reason for archiving (optional)"
          placeholder="Explain why this guide is being archived..."
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isLoading}
            className="flex items-center gap-1 bg-gray-700 text-white px-4 py-2 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            <Archive size={16} />
            {mutation.isLoading ? 'Archiving...' : 'Archive Guide'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ArchiveGuideModal;