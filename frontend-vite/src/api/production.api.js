import api from '../services/api.service';

const productionApi = {
  // Existing methods...
  getAllGuides: ({ archived = false } = {}) => 
    api.get(`/production/guides?archived=${archived}`).then(res => res.data),

  getGuideById: (id) => 
    api.get(`/production/guides/${id}`).then(res => res.data),

  createGuide: (formData) =>
    api.post('/production/guides', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  updateGuide: (id, formData) =>
    api.put(`/production/guides/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  deleteGuide: (id) =>
    api.delete(`/production/guides/${id}`).then(res => res.data),

  assignUser: (guideId, userId, notify = true) =>
    api.post(`/production/guides/${guideId}/assign`, { 
      userId,
      notify
    }).then(res => res.data),

  assignUsers: (guideId, userIds, notify = true) =>
    api.post(`/production/guides/${guideId}/assign-users`, { 
      userIds,
      notify 
    }).then(res => res.data),

  removeUser: (guideId, userId) =>
    api.delete(`/production/guides/${guideId}/assign/${userId}`).then(res => res.data),

  getAssignedUsers: (guideId) =>
    api.get(`/production/guides/${guideId}/assigned-users`).then(res => res.data),

  submitManualWork: (guideId, payload) =>
    api.post(`/production/guides/${guideId}/manual-work`, payload).then(res => res.data),
    
  addStep: (guideId, formData) => 
    api.post(`/production/guides/${guideId}/steps`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
  
  // Add the new method for getting step details
  getStepById: (stepId) =>
    api.get(`/production/steps/${stepId}`).then(res => res.data),
    
  updateStep: (stepId, formData, notifyOptions = {}) => {
    const enhancedForm = new FormData();
    
    for (const [key, value] of formData.entries()) {
      enhancedForm.append(key, value);
    }
    
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
    
  getStepComments: (stepId) =>
    api.get(`/production/steps/${stepId}/comments`).then(res => res.data),
    
  addStepComment: (stepId, formData, notifyRecipients = true) => {
    const enhancedForm = new FormData();
    
    for (const [key, value] of formData.entries()) {
      enhancedForm.append(key, value);
    }
    
    if (!formData.has('notify')) {
      enhancedForm.append('notify', notifyRecipients);
    }
    
    return api.post(`/production/steps/${stepId}/comments`, enhancedForm, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  
  startWorkOnStep: (stepId, data = {}) =>
    api.post(`/production/steps/${stepId}/work/start`, data).then(res => res.data),
    
  endWorkOnStep: (stepId, data = {}) =>
    api.post(`/production/steps/${stepId}/work/end`, data).then(res => res.data),

  deleteAttachment: (attachmentId) =>
    api.delete(`/production/attachments/${attachmentId}`).then(res => res.data),
    
  addInventoryToGuide: (guideId, items) =>
    api.post(`/production/guides/${guideId}/inventory`, { items }).then(res => res.data),
    
  getGuideInventory: (guideId) =>
    api.get(`/production/guides/${guideId}/inventory`).then(res => res.data),
    
  updateInventoryItem: (guideId, itemId, quantity) =>
    api.put(`/production/guides/${guideId}/inventory/${itemId}`, { quantity }).then(res => res.data),
    
  removeInventoryItem: (guideId, itemId) =>
    api.delete(`/production/guides/${guideId}/inventory/${itemId}`).then(res => res.data),

  fetchCommentsForGuide: (id) =>
    api.get(`/production/guides/${id}/comments`).then(res => res.data),
  
  postCommentToGuide: (id, content) =>
    api.post(`/production/guides/${id}/comments`, { content }).then(res => res.data),
    
  // New method for the ProductionPage
  getAllProductionGuides: ({ page = 1, limit = 10, status, priority }) => {
    const params = new URLSearchParams({ page, limit });
    if (status) params.append('status', status);
    if (priority) params.append('priority', priority);
    return api.get(`/production/guides?${params.toString()}`).then(res => res.data);
  },

  // New methods for user assignment to steps
  getStepAssignedUsers: (stepId) =>
    api.get(`/production/steps/${stepId}/assigned-users`).then(res => res.data),
    
  assignUsersToStep: (stepId, userIds, notify = true) =>
    api.post(`/production/steps/${stepId}/assign-users`, { 
      userIds,
      notify 
    }).then(res => res.data),
    
  removeUserFromStep: (stepId, userId) =>
    api.delete(`/production/steps/${stepId}/assign/${userId}`).then(res => res.data),
    
  // Get all users method (needed for user assignment)
  getAllUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    return api.get(`/users?${queryParams.toString()}`).then(res => res.data);
  },

  // New method for fetching step work entries
  getStepWorkEntries: async (stepId) => {
    try {
      const response = await api.get(`/production/steps/${stepId}/work-entries`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default productionApi;