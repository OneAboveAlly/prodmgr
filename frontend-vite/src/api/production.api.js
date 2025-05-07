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
      
      // EKSPERYMENT - PRÓBUJEMY POBRAĆ KAŻDY PRZEWODNIK INDYWIDUALNIE
      // Ta modyfikacja tymczasowo zastępuje żądanie do /guides indywidualnymi żądaniami
      // po przewodniku, aby sprawdzić czy problem jest w API
      if (params.experimentalDetailFetch) {
        try {
          console.log('EXPERIMENTAL MODE: Fetching individual guides');
          // Najpierw pobieramy listę standardowo
          const listResponse = await api.get('/production/guides', { 
            params: {
              ...params,
              includeSteps: false // Nie pobieramy kroków, tylko listę
            }
          });
          
          if (!listResponse.data || !listResponse.data.guides) {
            return { guides: [], pagination: { total: 0, page: 1, pages: 1 } };
          }
          
          // Zapisujemy oryginalne dane paginacji
          const originalPagination = listResponse.data.pagination;
          const originalStats = listResponse.data.stats;
          
          // Używamy pełnej listy przewodników z paginacji, zamiast ograniczania do 3
          const limitedGuides = listResponse.data.guides;
          console.log(`EXPERIMENTAL: Fetching ${limitedGuides.length} guides individually`);
          
          // Teraz dla każdego przewodnika pobieramy pełne dane
          const detailedGuides = await Promise.all(
            limitedGuides.map(async guide => {
              try {
                console.log(`EXPERIMENTAL: Fetching guide ${guide.id}`);
                const detailResponse = await api.get(`/production/guides/${guide.id}`, {
                  params: {
                    includeSteps: true,
                    includeStats: true,
                    includeTimeData: true,
                    includeStepData: true,
                    complete: true
                  }
                });
                
                // Zwracamy pełne dane przewodnika
                const detailedGuide = detailResponse.data.guide || detailResponse.data;
                console.log(`EXPERIMENTAL: Guide ${guide.id} fetched with ${detailedGuide.steps?.length || 0} steps`);
                
                // Przetwórz etapy jeśli istnieją
                if (detailedGuide.steps && Array.isArray(detailedGuide.steps)) {
                  detailedGuide.steps = detailedGuide.steps.map(step => {
                    if (!step) return {}; 
                    
                    const estimatedTime = Number(step.estimatedTime || 0);
                    const actualTime = Number(step.actualTime || 0);
                    
                    const processedActualTime = 
                      step.status === 'COMPLETED' && actualTime === 0 ? estimatedTime : actualTime;
                    
                    return {
                      ...step,
                      estimatedTime,
                      actualTime: processedActualTime
                    };
                  });
                  
                  // Oblicz statystyki czasu
                  const totalEstimatedTime = detailedGuide.steps.reduce((sum, step) => sum + step.estimatedTime, 0);
                  const totalActualTime = detailedGuide.steps.reduce((sum, step) => sum + step.actualTime, 0);
                  
                  // Upewnij się, że struktura statystyk istnieje
                  if (!detailedGuide.stats) detailedGuide.stats = {};
                  if (!detailedGuide.stats.time) detailedGuide.stats.time = {};
                  
                  // Ustaw wartości statystyk
                  detailedGuide.stats.time.totalEstimatedTime = totalEstimatedTime;
                  detailedGuide.stats.time.totalActualTime = totalActualTime;
                }
                
                return detailedGuide;
              } catch (error) {
                console.error(`EXPERIMENTAL: Error fetching guide ${guide.id}:`, error);
                return guide; // Fallback do oryginalnego przewodnika
              }
            })
          );
          
          console.log('EXPERIMENTAL: All individual guides fetched');
          
          // Zwróć zmodyfikowane dane
          return {
            guides: detailedGuides,
            pagination: originalPagination,
            stats: originalStats
          };
        } catch (error) {
          console.error('EXPERIMENTAL: Failed experimental fetching:', error);
          // Fallback do standardowego pobierania
        }
      }
      
      // Standardowe pobieranie danych...
      const response = await api.get('/production/guides', { 
        params: {
          ...params,
          includeSteps: true,
          includeTimeData: true, 
          includeStats: true,
          complete: true,
          includeStepData: true
        }
      });
      
      // Ensure response data exists
      if (!response.data) {
        console.error('Empty response when fetching guides');
        return { guides: [], pagination: { total: 0, page: 1, pages: 1 } };
      }
      
      // Zapisz oryginalną odpowiedź dla celów debugowania
      console.log('Raw API response structure:', 
        Object.keys(response.data).join(', '),
        'guides count:', response.data.guides?.length);
        
      // Wybierz pierwszy przewodnik do debugowania (jeżeli istnieje)
      if (response.data.guides && response.data.guides.length > 0) {
        const firstGuide = response.data.guides[0];
        console.log('First guide data sample:', {
          id: firstGuide.id,
          title: firstGuide.title,
          hasSteps: !!firstGuide.steps,
          stepsCount: firstGuide.steps?.length || 0,
          hasStats: !!firstGuide.stats,
          timeStats: firstGuide.stats?.time || null
        });
      }
      
      // Fix and normalize guide data for consistent progress bars
      if (response.data && response.data.guides) {
        response.data.guides = response.data.guides.map(guide => {
          // Safety check for null guide
          if (!guide) return null;
          
          console.log(`\nProcessing guide ${guide.id}:`);
          console.log(`- Title: ${guide.title}`);
          console.log(`- Has steps: ${!!guide.steps} (count: ${guide.steps?.length || 0})`);
          console.log(`- Has stats: ${!!guide.stats}`);
          
          // Ensure steps array exists
          if (!guide.steps) guide.steps = [];
          
          // Ensure each step has proper time data
          console.log(`- Step details:`);
          const processedSteps = guide.steps.map((step, idx) => {
            if (!step) {
              console.log(`  - Step ${idx}: NULL`);
              return {}; // Handle null step
            }
            
            const estimatedTime = Number(step.estimatedTime || 0);
            const actualTime = Number(step.actualTime || 0);
            
            // For completed steps with no actual time, use estimated time
            const processedActualTime = 
              step.status === 'COMPLETED' && actualTime === 0 ? estimatedTime : actualTime;
            
            console.log(`  - Step ${idx} [${step.id}]: status=${step.status}, est=${estimatedTime}, act=${actualTime} -> ${processedActualTime}`);
            
            return {
              ...step,
              estimatedTime,
              actualTime: processedActualTime
            };
          });
          
          // Calculate time stats directly from steps
          const totalEstimatedTime = processedSteps.reduce((sum, step) => sum + step.estimatedTime, 0);
          const totalActualTime = processedSteps.reduce((sum, step) => sum + step.actualTime, 0);
          
          console.log(`- Calculated totals: Est=${totalEstimatedTime}, Act=${totalActualTime}`);
          
          // Ensure stats exist with proper structure
          const stats = guide.stats ? { ...guide.stats } : {};
          if (!stats.time) stats.time = {};
          
          // ZAWSZE nadpisujemy wartości statystyk czasu obliczonymi danymi z kroków
          stats.time = {
            ...stats.time,
            totalEstimatedTime: totalEstimatedTime,
            totalActualTime: totalActualTime
          };
          
          console.log(`- Final time stats: Est=${stats.time.totalEstimatedTime}, Act=${stats.time.totalActualTime}`);
          
          // Return processed guide
          return {
            ...guide,
            steps: processedSteps,
            stats
          };
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
      
      console.log('Processed guides data ready to return.');
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
      console.log(`Fetching guide with ID: ${id}, params:`, params);
      
      // Validate ID before making request
      if (!id || typeof id !== 'string' || id.length < 10) {
        throw new Error('Invalid guide ID');
      }
      
      const response = await api.get(`/production/guides/${id}`, {
        params: {
          includeSteps: true,
          includeStats: true,
          includeTimeData: true,
          includeStepData: true,
          complete: true,
          ...params
        },
        // Add longer timeout for potentially large responses
        timeout: 15000
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
      
      // If guide has steps, process them to ensure proper time data
      if (guide.steps && Array.isArray(guide.steps)) {
        console.log(`Processing ${guide.steps.length} steps for guide ${id}`);
        
        guide.steps = guide.steps.map(step => {
          if (!step) return {}; // Handle null step
          
          const estimatedTime = Number(step.estimatedTime || 0);
          const actualTime = Number(step.actualTime || 0);
          
          // For completed steps with no actual time, use estimated time
          const processedActualTime = 
            step.status === 'COMPLETED' && actualTime === 0 ? estimatedTime : actualTime;
          
          return {
            ...step,
            estimatedTime,
            actualTime: processedActualTime
          };
        });
      } else {
        // Ensure steps is always an array
        guide.steps = [];
      }
      
      // Ensure stats exists with proper structure
      if (!guide.stats) guide.stats = {};
      if (!guide.stats.time) guide.stats.time = {};
      
      // Calculate and update time stats directly from steps if available
      if (guide.steps.length > 0) {
        const totalEstimatedTime = guide.steps.reduce((sum, step) => sum + Number(step.estimatedTime || 0), 0);
        const totalActualTime = guide.steps.reduce((sum, step) => sum + Number(step.actualTime || 0), 0);
        
        // Only update if we have valid data (prevent overwriting with zeros)
        if (totalEstimatedTime > 0 || totalActualTime > 0) {
          guide.stats.time = {
            ...guide.stats.time,
            totalEstimatedTime,
            totalActualTime
          };
        }
      }
      
      return guide;
    } catch (error) {
      // Log detailed error for debugging
      console.error(`Error fetching guide ${id}:`, error);
      
      // Construct a more helpful error message
      let errorMessage = `Failed to load guide: ${error.message}`;
      
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = `Guide with ID ${id} not found`;
        } else if (error.response.status === 500) {
          errorMessage = 'Server error: The guide could not be loaded due to a server issue';
        }
      } else if (error.request) {
        errorMessage = 'Network error: Unable to reach the server';
      }
      
      // Keep the original error but enhance it with more context
      error.displayMessage = errorMessage;
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
      
      // Check if user has admin permissions (not used directly but logged for debugging)
      try {
        const authContext = window.localStorage.getItem('user');
        if (authContext) {
          const user = JSON.parse(authContext);
          const hasAdminRole = user.roles && user.roles.some(role => 
            role.name === 'Admin' || role.name === 'Administrator'
          );
          console.debug(`User is${hasAdminRole ? '' : ' not'} an admin when deleting guide ${id}`);
        }
      } catch (checkError) {
        console.warn('Failed to check admin status:', checkError);
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
      notifyMessage: notifyMessage || `Zostałeś przypisany do przewodnika`
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
  archiveGuide: async (guideId, data = { reason: '' }) => {
    try {
      console.log('Archiving guide with data:', data);
      const response = await api.put(`/production/guides/${guideId}/archive`, data);
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
      // Ensure that numeric parameters are converted to strings
      const processedParams = {
        page: params.page?.toString() || '1',
        limit: params.limit?.toString() || '10',
        search: params.search || '',
        sortBy: params.sortBy || 'archivedAt',
        sortOrder: params.sortOrder || 'desc'
      };
      
      console.log('Requesting archived guides with params:', processedParams);
      
      const response = await api.get('/production/guides/archived', { params: processedParams });
      return response.data;
    } catch (error) {
      console.error('Error fetching archived guides:', error);
      throw error;
    }
  },

  // Template guide features
  createGuideFromTemplate: (templateId, data) => {
    // Zmiana: zamiast używać endpointu template, tworzymy nowy przewodnik
    // poprzez standardowe utworzenie z isTemplate=false
    // i kopiujemy dane szablonu
    return api.get(`/production/guides/${templateId}`)
      .then(() => {
        // Przygotowujemy dane do utworzenia nowego przewodnika
        const newGuideData = new FormData();
        
        // Dodajemy dane z formularza
        if (data instanceof FormData) {
          for (const [key, value] of data.entries()) {
            newGuideData.append(key, value);
          }
        } else {
          // Jeśli data nie jest FormData, konwertujemy
          Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              newGuideData.append(key, value);
            }
          });
        }
        
        // Dodajemy informację o źródle szablonu
        newGuideData.append('sourceTemplateId', templateId);
        
        // Tworzymy nowy przewodnik
        return api.post('/production/guides', newGuideData);
      })
      .then(res => {
        if (res.data && res.data.guide) {
          return res.data.guide;
        }
        return res.data;
      });
  },

  saveGuideAsTemplate: (guideId, data = {}) => {
    // Tworzymy FormData jeśli data nie jest już FormData
    const formData = data instanceof FormData ? data : new FormData();
    
    // Dodajemy dane
    if (!(data instanceof FormData)) {
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
    }
    
    // Oznaczamy jako szablon
    formData.append('isTemplate', 'true');
    
    // Kopiujemy przewodnik jako szablon przez zwykłe utworzenie przewodnika
    return api.get(`/production/guides/${guideId}`)
      .then(() => {
        formData.append('sourceGuideId', guideId);
        return api.post('/production/guides', formData);
      })
      .then(res => res.data);
  },

  getGuideTemplates: ({ page = 1, limit = 10, search = '' } = {}) => {
    // Modyfikacja: Używamy endpointu /guides z parametrem isTemplate=true
    // zamiast nieistniejącego endpointu /templates
    const params = {
      page: page?.toString() || '1',
      limit: limit?.toString() || '10',
      search: search || '',
      isTemplate: 'true'
    };
    
    console.log('Requesting guide templates with params:', params);
    
    return api.get(`/production/guides`, { params }).then(res => {
      // Dostosowujemy format odpowiedzi
      return {
        templates: res.data.guides || [],
        pagination: res.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 1
        }
      };
    }).catch(error => {
      console.error('Error fetching guide templates:', error);
      throw error;
    });
  },

  // Mock data for active users - in a real application, this would be managed by the server
  activeUsersByGuide: {},
  mockUsers: [
    { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
    { id: '2', firstName: 'Anna', lastName: 'Nowak' },
    { id: '3', firstName: 'Piotr', lastName: 'Wiśniewski' },
    { id: '4', firstName: 'Maria', lastName: 'Dąbrowska' }
  ],

  /**
   * Get users currently viewing a guide (mock implementation)
   * @param {string} guideId - ID of the guide
   * @returns {Promise<Array>} - List of active users
   */
  getGuideActiveUsers: async (guideId) => {
    // In real implementation, this would call the backend API
    // For demo purposes, we'll return 0-3 random users
    
    if (!productionApi.activeUsersByGuide[guideId]) {
      // Randomly choose 0-3 users for this guide
      const randomCount = Math.floor(Math.random() * 4);
      productionApi.activeUsersByGuide[guideId] = [];
      
      // Shuffle and pick random users
      const shuffled = [...productionApi.mockUsers].sort(() => 0.5 - Math.random());
      productionApi.activeUsersByGuide[guideId] = shuffled.slice(0, randomCount);
    }
    
    return productionApi.activeUsersByGuide[guideId];
  },

  /**
   * Report user activity on a guide (mock implementation)
   * @param {string} guideId - ID of the guide
   * @param {object} data - Activity data
   * @returns {Promise<object>} - Response
   */
  reportGuideActivity: async (guideId, data) => {
    // In a real implementation, this would send data to the server
    console.log(`User activity reported for guide ${guideId}: ${data.action}`);
    
    // For demo, we'll simulate adding the current user to active users
    if (data.action === 'viewing') {
      if (!productionApi.activeUsersByGuide[guideId]) {
        productionApi.activeUsersByGuide[guideId] = [];
      }
      
      // Add a mock current user if not already present
      const currentUser = { id: '999', firstName: 'Current', lastName: 'User' };
      if (!productionApi.activeUsersByGuide[guideId].find(u => u.id === currentUser.id)) {
        productionApi.activeUsersByGuide[guideId].push(currentUser);
      }
    } else if (data.action === 'left') {
      // Remove the mock current user
      if (productionApi.activeUsersByGuide[guideId]) {
        productionApi.activeUsersByGuide[guideId] = productionApi.activeUsersByGuide[guideId].filter(u => u.id !== '999');
      }
    }
    
    return { success: true };
  }
};

export default productionApi;