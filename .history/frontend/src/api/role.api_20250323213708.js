import api from '../services/api.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/roles`;

const roleApi = {
  // Get all roles with pagination - ensure we return consistent format
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
    // Normalize response to always return roles as an array
    if (response.data?.roles) {
      return { data: response.data.roles };
    }
    return response;
  },
  
  // Get a single role by ID
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  
  // Create a new role
  create: async (roleData) => {
    const response = await api.post(BASE_URL, roleData);
    // Normalize response
    return response;
  },
  
  // Update a role
  update: (id, roleData) => api.put(`${BASE_URL}/${id}`, roleData),
  
  // Delete a role
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  
  // Get all permissions
  getAllPermissions: async () => {
    const response = await api.get(`${BASE_URL}/permissions`);
    return response;
  }
};

export default roleApi;