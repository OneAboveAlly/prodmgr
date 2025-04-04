// src/utils/guideArchiveUtils.js
import api from '../services/api.service';
import { toast } from 'react-toastify';

/**
 * Archive a production guide
 * @param {string} guideId - The ID of the guide to archive
 * @param {string} reason - Optional reason for archiving
 * @returns {Promise} Promise that resolves to the API response
 */
export const archiveGuide = async (guideId, reason = '') => {
  try {
    const response = await api.patch(`/production/guides/${guideId}/archive`, {
      reason
    });
    
    toast.success('Guide archived successfully');
    return response.data;
  } catch (error) {
    console.error('Error archiving guide:', error);
    toast.error(error.response?.data?.message || 'Error archiving guide');
    throw error;
  }
};

/**
 * Restore an archived guide
 * @param {string} guideId - The ID of the guide to restore
 * @returns {Promise} Promise that resolves to the API response
 */
export const restoreGuide = async (guideId) => {
  try {
    const response = await api.patch(`/production/guides/${guideId}/restore`);
    
    toast.success('Guide restored successfully');
    return response.data;
  } catch (error) {
    console.error('Error restoring guide:', error);
    toast.error(error.response?.data?.message || 'Error restoring guide');
    throw error;
  }
};

/**
 * Archive multiple guides at once
 * @param {Array<string>} guideIds - Array of guide IDs to archive
 * @param {string} reason - Optional reason for archiving
 * @returns {Promise} Promise that resolves to the API response
 */
export const archiveMultipleGuides = async (guideIds, reason = '') => {
  if (!guideIds || !guideIds.length) {
    return;
  }
  
  try {
    const response = await api.post('/production/guides/bulk-archive', {
      guideIds,
      reason
    });
    
    toast.success(`${guideIds.length} guides archived successfully`);
    return response.data;
  } catch (error) {
    console.error('Error archiving guides:', error);
    toast.error(error.response?.data?.message || 'Error archiving guides');
    throw error;
  }
};

/**
 * Check if a guide can be archived (not already archived and not in progress)
 * @param {Object} guide - The guide object to check
 * @returns {boolean} Whether the guide can be archived
 */
export const canArchiveGuide = (guide) => {
  if (!guide) return false;
  
  // Cannot archive already archived guides
  if (guide.status === 'ARCHIVED') return false;
  
  // Cannot archive guides that are in progress with active steps
  if (guide.status === 'IN_PROGRESS') {
    // If guide has steps and any are in progress, don't allow archiving
    if (guide.steps && Array.isArray(guide.steps)) {
      const hasActiveSteps = guide.steps.some(step => step.status === 'IN_PROGRESS');
      if (hasActiveSteps) return false;
    }
  }
  
  return true;
};