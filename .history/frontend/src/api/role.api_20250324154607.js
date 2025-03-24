import api from '../services/api.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/roles`;

const roleApi = {
  // Get all roles with pagination
  getAll: (page = 1, limit = 10) => 
    api.get(`${BASE_URL}?page=${page}&limit=${limit}`),
  
  // Get a single role by ID
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  
  // Create a new role
  create: (roleData) => api.post(BASE_URL, roleData),
  
  // Update a role
  update: (id, roleData) => api.put(`${BASE_URL}/${id}`, roleData),
  
  // Delete a role
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  
  // Get all permissions
  getAllPermissions: () => api.get(`${BASE_URL}/permissions`)
};

export default roleApi;