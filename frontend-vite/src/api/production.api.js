// src/api/production.api.js
import api from '../services/api.service';

const BASE_URL = '/production'; // BEZ /api, bo zakładam że api.service ma już prefix /api

const productionApi = {
  getAllGuides: () => api.get(`${BASE_URL}/guides`).then(res => res.data),

  getGuideById: (id) => api.get(`${BASE_URL}/guides/${id}`).then(res => res.data),

  createGuide: (formData) =>
    api.post(`${BASE_URL}/guides`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  updateGuide: (id, formData) =>
    api.put(`${BASE_URL}/guides/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(res => res.data),

  deleteGuide: (id) =>
    api.delete(`${BASE_URL}/guides/${id}`).then(res => res.data),

  // User assignment functions
  assignUser: (guideId, userId) =>
    api.post(`${BASE_URL}/guides/${guideId}/assign`, { userId }).then(res => res.data),

  assignUsers: (guideId, userIds) =>
    api.post(`${BASE_URL}/guides/${guideId}/assign-users`, { userIds }).then(res => res.data),

  removeUser: (guideId, userId) =>
    api.delete(`${BASE_URL}/guides/${guideId}/assign/${userId}`).then(res => res.data),

  getAssignedUsers: (guideId) =>
    api.get(`${BASE_URL}/guides/${guideId}/assigned-users`).then(res => res.data),

  // Work and steps
  submitManualWork: (guideId, payload) =>
    api.post(`${BASE_URL}/guides/${guideId}/manual-work`, payload).then(res => res.data),
    
  addStep: (guideId, formData) => 
    api.post(`${BASE_URL}/guides/${guideId}/steps`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
    
  updateStep: (stepId, formData) =>
    api.put(`${BASE_URL}/steps/${stepId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),
    
  deleteStep: (stepId) =>
    api.delete(`${BASE_URL}/steps/${stepId}`).then(res => res.data),
    
  getStepComments: (stepId) =>
    api.get(`${BASE_URL}/steps/${stepId}/comments`).then(res => res.data),
    
  addStepComment: (stepId, formData) =>
    api.post(`${BASE_URL}/steps/${stepId}/comments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data),

  deleteAttachment: (attachmentId) =>
    api.delete(`${BASE_URL}/attachments/${attachmentId}`).then(res => res.data),
};

export default productionApi;