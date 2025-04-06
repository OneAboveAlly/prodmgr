// frontend-vite/src/api/production.api.js
import api from '../services/api.service';

const productionApi = {
  /**
   * Get all production guides with complete data for progress calculation
   * @param {Object} params - Filter parameters
   * @returns {Promise<Object>} - List of guides with pagination
   */
  getAllProductionGuides: async (params = {}) => {
    try {
      console.log('Fetching guides with params:', params);
      
      // Request detailed data for progress calculation
      const response = await api.get('/production/guides', { 
        params: {
          ...params,
          includeSteps: true,
          includeTimeData: true, 
          includeStats: true,
          complete: true
        }
      });
      
      // Ensure response data exists
      if (!response.data) {
        console.error('Empty response when fetching guides');
        return { guides: [], pagination: { total: 0, page: 1, pages: 1 } };
      }
      
      // Ensure each guide has valid data structure
      if (response.data && response.data.guides) {
        response.data.guides = response.data.guides.map(guide => {
          // Safety check for null guide
          if (!guide) return null;
          
          // Ensure steps array exists
          if (!guide.steps) guide.steps = [];
          
          // Ensure each step has proper time data
          guide.steps = guide.steps.map(step => {
            if (!step) return {}; // Handle null step
            
            const estimatedTime = Number(step.estimatedTime || 0);
            const actualTime = Number(step.actualTime || 0);
            
            return {
              ...step,
              estimatedTime,
              actualTime,
              // If step is complete but has no actual time, set it to estimated time
              ...(step.status === 'COMPLETED' && actualTime === 0 ? 
                  { actualTime: estimatedTime } : {})
            };
          });
          
          // Ensure stats exist
          if (!guide.stats) guide.stats = {};
          if (!guide.stats.time) guide.stats.time = {};
          
          // Calculate time stats if missing
          const totalEstimatedTime = guide.steps.reduce((sum, step) => sum + step.estimatedTime, 0);
          const totalActualTime = guide.steps.reduce((sum, step) => sum + step.actualTime, 0);
          
          guide.stats.time.totalEstimatedTime = guide.stats.time.totalEstimatedTime || totalEstimatedTime;
          guide.stats.time.totalActualTime = guide.stats.time.totalActualTime || totalActualTime;
          
          return guide;
        }).filter(guide => guide !== null); // Remove any null guides
      }
      
      // Ensure pagination exists
      if (!response.data.pagination) {
        response.data.pagination = {
          total: response.data.guides ? response.data.guides.length : 0,
          page: params.page || 1,
          limit: params.limit || 10,
          pages: 1
        };
      }
      
      // Ensure stats exist
      if (!response.data.stats) {
        response.data.stats = {
          totalGuides: response.data.guides ? response.data.guides.length : 0,
          inProgress: 0,
          completed: 0,
          critical: 0
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error fetching guides:', error);
      throw error;
    }
  },

  /**
   * Get a production guide by ID
   * @param {string} id - Guide ID
   * @param {Object} params - Additional query parameters
   * @returns {Promise<Object>} - Guide details
   */
  getGuideById: async (id, params = {}) => {
    try {
      const response = await api.get(`/production/guides/${id}`, {
        params: {
          includeSteps: true,
          includeStats: true,
          includeTimeData: true,
          ...params
        }
      });
      
      // Process and normalize the data
      const guideData = response.data;
      
      // Handle both nested and flat response structures
      const guide = guideData.guide || guideData;
      
      // Ensure guide has all required fields
      if (!guide || !guide.id) {
        console.error('Invalid guide data received:', guideData);
        throw new Error('Invalid guide data received from server');
      }
      
      console.log(`Guide ${id} fetched successfully:`, guide);
      return guideData;
    } catch (error) {
      console.error(`Error fetching guide ${id}:`, error);
      throw error;
    }
  },

  // Create a new guide
  createGuide: (formData) =>
    api.post('/production/guides', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => {
      // Handle possible nested structure
      if (res.data && res.data.guide) {
        return res.data.guide;
      }
      return res.data;
    }),

  // Update a guide with improved error handling
  updateGuide: (id, formData) =>
    api.put(`/production/guides/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(res => {
      // Handle possible nested structure
      if (res.data && res.data.guide) {
        return res.data.guide;
      }
      return res.data;
    })
    .catch(error => {
      console.error('Error updating guide:', error);
      
      // Extract the most useful error message
      const errorMessage = 
        error.response?.data?.message || 
        error.response?.data?.error || 
        error.message || 
        'Unknown server error';
      
      // Throw a more informative error
      throw new Error(`Failed to update guide: ${errorMessage}`);
    }),

  /**
   * Delete a production guide
   * @param {string} id - Guide ID
   * @returns {Promise<Object>} - Response from server
   */
  deleteGuide: async (id) => {
    try {
      console.log(`Initiating delete for guide: ${id}`);
      
      // Check if the user is an admin
      let isAdmin = false;
      try {
        const authContext = window.localStorage.getItem('user');
        if (authContext) {
          const user = JSON.parse(authContext);
          isAdmin = user.roles && user.roles.some(role => 
            role.name === 'Admin' || role.name === 'Administrator'
          );
        }
      } catch (err) {
        console.warn('Failed to check admin status, continuing with standard delete');
      }
      
      // Make the delete request
      const response = await api.delete(`/production/guides/${id}`);
      console.log(`Successfully deleted guide with ID: ${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting guide ${id}:`, error);
      
      if (error.response) {
        console.log('Error response status:', error.response.status);
        console.log('Error response data:', error.response.data);
        
        if (error.response.status === 403) {
          const errorData = error.response.data;
          if (errorData && errorData.requiredPermission && errorData.requiredValue) {
            throw new Error(
              `You do not have permission to delete this guide. Required: ${errorData.requiredPermission} (Level ${errorData.requiredValue}), but your level is ${errorData.actualValue}. Contact administrator if needed.`
            );
          } else {
            throw new Error('You do not have permission to delete this guide. Contact administrator if needed.');
          }
        } else if (error.response.data && error.response.data.message) {
          throw new Error(error.response.data.message);
        }
      }
      
      throw error;
    }
  },

  // Get guide change history
  getGuideChangeHistory: (guideId) =>
    api.get(`/production/guides/${guideId}/history`).then(res => {
      if (res.data && res.data.changes) {
        return res.data.changes;
      }
      return res.data;
    }),

  // User assignment functions
  assignUser: (guideId, userId) =>
    api.post(`/production/guides/${guideId}/assign`, { userId }).then(res => res.data),

  assignUsers: (guideId, userIds, notify = true, notifyMessage = '') => {
    // Create a proper payload object with all required fields
    const payload = {
      userIds,
      notify: notify === true || notify === 'true', // ensure boolean type
      notifyMessage: notifyMessage || `You have been assigned to guide`
    };
    
    console.log('Sending assignment request with payload:', payload);
    
    return api.post(`/production/guides/${guideId}/assign-users`, payload)
      .then(res => {
        console.log('Assignment response:', res.data);
        return res.data;
      })
      .catch(err => {
        console.error('Assignment error:', err);
        throw err;
      });
  },

  removeUser: (guideId, userId) =>
    api.delete(`/production/guides/${guideId}/assign/${userId}`).then(res => res.data),

  getAssignedUsers: (guideId) =>
    api.get(`/production/guides/${guideId}/assigned-users`).then(res => {
      if (res.data && res.data.users) {
        return res.data.users;
      }
      return res.data;
    }),

  submitManualWork: (guideId, payload) =>
    api.post(`/production/guides/${guideId}/manual-work`, payload).then(res => res.data),
    
  // Step functions
  addStep: (guideId, formData) => 
    api.post(`/production/guides/${guideId}/steps`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => {
      if (res.data && res.data.step) {
        return res.data.step;
      }
      return res.data;
    }),
  
  getStepById: (stepId) =>
    api.get(`/production/steps/${stepId}`).then(res => {
      // Some controllers may return data wrapped in 'step'
      if (res.data && res.data.step) {
        return res.data.step;
      }
      return res.data;
    }),
    
  updateStep: (stepId, formData, notifyOptions = {}) => {
    const enhancedForm = new FormData();
    
    // If formData is already a FormData object
    if (formData instanceof FormData) {
      for (const [key, value] of formData.entries()) {
        enhancedForm.append(key, value);
      }
    } else {
      // If formData is a plain object
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          enhancedForm.append(key, value);
        }
      });
    }
    
    // Add notification options
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
    }).then(res => {
      if (res.data && res.data.step) {
        return res.data.step;
      }
      return res.data;
    });
  },
    
  deleteStep: (stepId) =>
    api.delete(`/production/steps/${stepId}`).then(res => res.data),
    
  // Step comments
  getStepComments: (stepId) =>
    api.get(`/production/steps/${stepId}/comments`).then(res => {
      if (res.data && Array.isArray(res.data.comments)) {
        return res.data.comments;
      }
      return res.data;
    }),
    
  addStepComment: (stepId, formData, notifyRecipients = true) => {
    const enhancedForm = new FormData();
    
    if (formData instanceof FormData) {
      for (const [key, value] of formData.entries()) {
        enhancedForm.append(key, value);
      }
    } else {
      Object.entries(formData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          enhancedForm.append(key, value);
        }
      });
    }
    
    if (!formData.has || !formData.has('notify')) {
      enhancedForm.append('notify', notifyRecipients);
    }
    
    return api.post(`/production/steps/${stepId}/comments`, enhancedForm, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => {
      if (res.data && res.data.comment) {
        return res.data.comment;
      }
      return res.data;
    });
  },
  
  // Work tracking
  startWorkOnStep: (stepId, data = {}) =>
    api.post(`/production/steps/${stepId}/work/start`, data).then(res => {
      if (res.data && res.data.workSession) {
        return res.data.workSession;
      }
      return res.data;
    }),
    
  endWorkOnStep: (stepId, data = {}) =>
    api.post(`/production/steps/${stepId}/work/end`, data).then(res => {
      if (res.data && res.data.workSession) {
        return res.data.workSession;
      }
      return res.data;
    }),

  addWorkEntry: (stepId, data) =>
    api.post(`/production/steps/${stepId}/work`, data).then(res => {
      if (res.data && res.data.workEntry) {
        return res.data.workEntry;
      }
      return res.data;
    }),

  getStepWorkEntries: async (stepId) => {
    try {
      const response = await api.get(`/production/steps/${stepId}/work-entries`);
      return response.data;
    } catch (error) {
      console.error('Error fetching step work entries:', error);
      throw error;
    }
  },

  // Inventory management for steps
  assignItemsToStep: (stepId, items) =>
    api.post(`/production/steps/${stepId}/inventory`, { items }).then(res => res.data),
    
  updateStepInventoryStatus: (inventoryId, status) =>
    api.put(`/production/step-inventory/${inventoryId}/status`, { status }).then(res => res.data),
    
  // Step assignment functions
  getStepAssignedUsers: async (stepId) => {
    try {
      const response = await api.get(`/production/steps/${stepId}/assigned-users`);
      return response.data;
    } catch (error) {
      console.error('Error fetching step assigned users:', error);
      throw error;
    }
  },
    
  assignUsersToStep: (stepId, userIds, notify = true, notifyMessage = null) =>
    api.post(`/production/steps/${stepId}/assign-users`, { 
      userIds,
      notify,
      notifyMessage 
    }).then(res => res.data),
    
  removeUserFromStep: (stepId, userId) =>
    api.delete(`/production/steps/${stepId}/assign/${userId}`).then(res => res.data),
    
  // Helper function for user selection
  getAllUsers: (params = {}) => {
    const queryParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        queryParams.append(key, value);
      }
    });
    
    return api.get(`/users?${queryParams.toString()}`).then(res => res.data);
  },

  // New attachment methods
  addGuideAttachments: (guideId, formData) => 
    api.post(`/production/guides/${guideId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  addStepAttachments: (stepId, formData) => 
    api.post(`/production/steps/${stepId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  deleteAttachment: (attachmentId) =>
    api.delete(`/production/attachments/${attachmentId}`).then(res => res.data),

  // Updated to include estimated time totals for progress calculations
  getGuideWorkEntries: async (guideId) => {
    try {
      const response = await api.get(`/production/guides/${guideId}/work-entries`);
      return response.data;
    } catch (error) {
      console.error('Error fetching guide work entries:', error);
      throw error;
    }
  },

  updateWorkEntry: async (entryId, data) => {
    try {
      const response = await api.put(`/production/work-entries/${entryId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating work entry:', error);
      throw error;
    }
  },

  deleteWorkEntry: (entryId) =>
    api.delete(`/production/work-entries/${entryId}`).then(res => res.data),

  // Guide archiving methods - Change endpoint to match backend API
  archiveGuide: async (guideId) => {
    try {
      const response = await api.put(`/production/guides/${guideId}/archive`);
      return response.data;
    } catch (error) {
      console.error('Error archiving guide:', error);
      throw error;
    }
  },

  unarchiveGuide: async (guideId) => {
    try {
      const response = await api.put(`/production/guides/${guideId}/unarchive`);
      return response.data;
    } catch (error) {
      console.error('Error unarchiving guide:', error);
      throw error;
    }
  },

  getArchivedGuides: async (params = {}) => {
    try {
      const response = await api.get('/production/guides/archived', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching archived guides:', error);
      throw error;
    }
  },

  // Template guide features
  createGuideFromTemplate: (templateId, data) =>
    api.post(`/production/guides/template/${templateId}`, data).then(res => {
      if (res.data && res.data.guide) {
        return res.data.guide;
      }
      return res.data;
    }),

  saveGuideAsTemplate: (guideId, data = {}) =>
    api.post(`/production/guides/${guideId}/template`, data).then(res => res.data),

  getGuideTemplates: ({ page = 1, limit = 10, search = '' } = {}) => {
    const params = new URLSearchParams({ page, limit, search, isTemplate: 'true' });
    return api.get(`/production/templates?${params.toString()}`).then(res => res.data);
  }
};

export default productionApi;