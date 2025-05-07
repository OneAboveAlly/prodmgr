// frontend-vite/src/components/production/AttachmentsViewer.jsx
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useAuth } from '../../contexts/AuthContext';
import productionApi from '../../api/production.api';

const AttachmentsViewer = ({ attachments, entityType, entityId }) => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [newFiles, setNewFiles] = useState([]);

  // Get base URL for attachments
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Determine file icon based on mimetype
  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (mimeType.includes('pdf')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Nieznany rozmiar';
    if (bytes < 1024) return bytes + ' bajtów';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Delete attachment mutation
  const deleteAttachmentMutation = useMutation({
    mutationFn: (attachmentId) => productionApi.deleteAttachment(attachmentId),
    onSuccess: () => {
      toast.success('Załącznik usunięty pomyślnie');
      // Invalidate queries based on entity type
      if (entityType === 'guide') {
        queryClient.invalidateQueries(['guide', entityId]);
      } else if (entityType === 'step') {
        queryClient.invalidateQueries(['step', entityId]);
      }
    },
    onError: (error) => {
      toast.error(`Błąd usuwania załącznika: ${error.message}`);
    }
  });

  // Handle file change for upload
  const handleFileChange = (e) => {
    setNewFiles(Array.from(e.target.files));
  };

  // Upload attachments mutation - would need separate API endpoint
  const uploadAttachmentsMutation = useMutation({
    mutationFn: (formData) => {
      if (entityType === 'guide') {
        return productionApi.addGuideAttachments(entityId, formData);
      } else if (entityType === 'step') {
        return productionApi.addStepAttachments(entityId, formData);
      }
    },
    onSuccess: () => {
      toast.success('Załączniki przesłane pomyślnie');
      setNewFiles([]);
      setIsUploading(false);
      // Invalidate queries based on entity type
      if (entityType === 'guide') {
        queryClient.invalidateQueries(['guide', entityId]);
      } else if (entityType === 'step') {
        queryClient.invalidateQueries(['step', entityId]);
      }
    },
    onError: (error) => {
      toast.error(`Błąd przesyłania załączników: ${error.message}`);
      setIsUploading(false);
    }
  });

  // Handle upload submission
  const handleUpload = (e) => {
    e.preventDefault();
    
    if (newFiles.length === 0) {
      toast.error('Proszę wybrać pliki do przesłania');
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    
    newFiles.forEach(file => {
      formData.append('attachments', file);
    });

    uploadAttachmentsMutation.mutate(formData);
  };

  // Handle attachment deletion
  const handleDeleteAttachment = (attachmentId) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten załącznik?')) {
      deleteAttachmentMutation.mutate(attachmentId);
    }
  };

  // If no attachments and no permission to add, don't render anything
  if (!attachments?.length && !hasPermission('production', 'update')) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-4">Załączniki</h2>
      
      {attachments && attachments.length > 0 ? (
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <ul className="divide-y divide-gray-200">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-gray-500 mr-2">
                    {getFileIcon(attachment.mimeType)}
                  </div>
                  <div>
                    <a 
                      href={`${baseUrl}/uploads/${attachment.filename}`} 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                    >
                      {attachment.filename}
                    </a>
                    <div className="text-xs text-gray-500">{formatFileSize(attachment.size)}</div>
                  </div>
                </div>
                
                {hasPermission('production', 'update') && (
                  <button
                    onClick={() => handleDeleteAttachment(attachment.id)}
                    className="text-red-600 hover:text-red-900"
                    disabled={deleteAttachmentMutation.isLoading}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="bg-gray-50 p-4 rounded-lg mb-4 text-center text-gray-500">
          Brak dostępnych załączników
        </div>
      )}

      {hasPermission('production', 'update') && (
        <div className="mt-4">
          <form onSubmit={handleUpload}>
            <div className="mb-3">
              <label htmlFor="files" className="block text-sm font-medium text-gray-700 mb-1">
                Prześlij nowe załączniki
              </label>
              <input
                type="file"
                id="files"
                multiple
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            
            {newFiles.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700">Wybrane pliki:</p>
                <ul className="mt-1 text-sm text-gray-500 list-disc pl-5">
                  {newFiles.map((file, index) => (
                    <li key={index}>
                      {file.name} ({formatFileSize(file.size)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button
              type="submit"
              disabled={isUploading || newFiles.length === 0}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
            >
              {isUploading ? 'Przesyłanie...' : 'Prześlij załączniki'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default AttachmentsViewer;