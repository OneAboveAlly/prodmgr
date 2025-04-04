// src/api/templates.api.js
import api from '../services/api.service';

const templatesApi = {
  // Get all production templates
  getAllTemplates: () => 
    api.get('/production/templates').then(res => res.data),
  
  // Get a single template by ID
  getTemplateById: (id) => 
    api.get(`/production/templates/${id}`).then(res => res.data),
  
  // Create a new template
  createTemplate: (templateData) => 
    api.post('/production/templates', templateData).then(res => res.data),
  
  // Update an existing template
  updateTemplate: (id, templateData) => 
    api.put(`/production/templates/${id}`, templateData).then(res => res.data),
  
  // Delete a template
  deleteTemplate: (id) => 
    api.delete(`/production/templates/${id}`).then(res => res.data),
  
  // Create template from an existing guide
  createTemplateFromGuide: (guideId, templateData) => 
    api.post(`/production/guides/${guideId}/template`, templateData).then(res => res.data),
  
  // Create a new guide from a template
  createGuideFromTemplate: (templateId, guideData) => 
    api.post(`/production/templates/${templateId}/guide`, guideData).then(res => res.data)
};

export default templatesApi;