// src/api/enhanced-production.api.js
import api from '../services/api.service';

const productionApi = {
  // Get all guides with optional archive filter
  getAllGuides: ({ archived = false } = {}) => 
    api.get(`/production/guides?archived=${archived}`).then(res => res.data),

  // Get a single guide by ID
  getGuideById: (id) => 
    api.get(`/production/guides/${id}`).then(res => res.data),

  // Create a new guide
  createGuide: (formData) =>
    api.post('/production/guides', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  // Update a guide
  updateGuide: (id, formData) =>
    api.put(`/production/guides/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  // Delete a guide
  deleteGuide: (id) =>
    api.delete(`/production/guides/${id}`).then(res => res.data),

  // User assignment functions
  assignUser: (guideId, userId, notify = true) =>
    api.post(`/production/guides/${guideId}/assign`, { 
      userId,
      notify  // Flag to send notification
    }).then(res => res.data),

  // Assign multiple users at once with notification option
  assignUsers: (guideId, userIds, notify = true) =>
    api.post(`/production/guides/${guideId}/assign-users`, { 
      userIds,
      notify 
    }).then(res => res.data),

  // Remove a user from a guide
  removeUser: (guideId, userId) =>
    api.delete(`/production/guides/${guideId}/assign/${userId}`).then(res => res.data),

  // Get assigned users for a guide
  getAssignedUsers: (guideId) =>
    api.get(`/production/guides/${guideId}/assigned-users`).then(res => res.data),

  // Manual work submission
  submitManualWork: (guideId, payload) =>
    api.post(`/production/guides/${guideId}/manual-work`, payload).then(res => res.data),
    
  // Step management
  addStep: (guideId, formData) => 
    api.post(`/production/guides/${guideId}/steps`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
    
  updateStep: (stepId, formData, notifyOptions = {}) => {
    // Add notification options to the form data
    const enhancedForm = new FormData();
    
    // Copy all existing form data entries
    for (const [key, value] of formData.entries()) {
      enhancedForm.append(key, value);
    }
    
    // Add notification options if not already present
    if (notifyOptions.notify !== undefined) {
      enhancedForm.append('notify', notifyOptions.notify);
    }
    
    if (notifyOptions.notifyMessage) {
      enhancedForm.append('notifyMessage', notifyOptions.notifyMessage);
    }
    
    if (notifyOptions.notifyUsers && Array.isArray(notifyOptions.notifyUsers)) {
      enhancedForm.append('notifyUsers', JSON.stringify(notifyOptions.notifyUsers));
    }
    
    return api.put(`/production/steps/${stepId}`, enhancedForm, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
    
  deleteStep: (stepId) =>
    api.delete(`/production/steps/${stepId}`).then(res => res.data),
    
  // Comment management with notification support
  getStepComments: (stepId) =>
    api.get(`/production/steps/${stepId}/comments`).then(res => res.data),
    
  addStepComment: (stepId, formData, notifyRecipients = true) => {
    // Add notification flag to form data
    const enhancedForm = new FormData();
    
    // Copy all existing form data entries
    for (const [key, value] of formData.entries()) {
      enhancedForm.append(key, value);
    }
    
    // Add notify flag if not already present
    if (!formData.has('notify')) {
      enhancedForm.append('notify', notifyRecipients);
    }
    
    return api.post(`/production/steps/${stepId}/comments`, enhancedForm, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  // Start/End Work on Step
  startWorkOnStep: (stepId, data = {}) =>
    api.post(`/production/steps/${stepId}/work/start`, data).then(res => res.data),
    
  endWorkOnStep: (stepId, data = {}) =>
    api.post(`/production/steps/${stepId}/work/end`, data).then(res => res.data),

  // Attachment management
  deleteAttachment: (attachmentId) =>
    api.delete(`/production/attachments/${attachmentId}`).then(res => res.data),
    
  // Inventory integration
  addInventoryToGuide: (guideId, items) =>
    api.post(`/production/guides/${guideId}/inventory`, { items }).then(res => res.data),
    
  getGuideInventory: (guideId) =>
    api.get(`/production/guides/${guideId}/inventory`).then(res => res.data),
    
  updateInventoryItem: (guideId, itemId, quantity) =>
    api.put(`/production/guides/${guideId}/inventory/${itemId}`, { quantity }).then(res => res.data),
    
  removeInventoryItem: (guideId, itemId) =>
    api.delete(`/production/guides/${guideId}/inventory/${itemId}`).then(res => res.data),
};

export default productionApi;