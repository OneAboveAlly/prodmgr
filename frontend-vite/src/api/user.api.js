import api from '../services/api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/users`;

const userApi = {
  getAll: async (page = 1, limit = 10) => {
    try {
      const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error.response?.status || error.message);
      throw error;
    }
  },

  getById: async (id) => {
    try {
      const response = await api.get(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error.response?.status || error.message);
      throw error;
    }
  },
  
  create: async (userData) => {
    try {
      const response = await api.post(BASE_URL, userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error.response?.status || error.message);
      throw error;
    }
  },
  
  update: async (id, userData) => {
    try {
      const response = await api.put(`${BASE_URL}/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error.response?.status || error.message);
      throw error;
    }
  },
  
  delete: async (id) => {
    try {
      const response = await api.delete(`${BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error.response?.status || error.message);
      throw error;
    }
  },

  getUsersByRole: async (roleName) => {
    try {
      const response = await api.get(`${BASE_URL}/role/${roleName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching users with role ${roleName}:`, error.response?.status || error.message);
      throw error;
    }
  },

  // New methods
  fetchAllUsers: async () => {
    const res = await fetch('/api/users');
    return res.json();
  },

  assignUserToGuide: async (guideId, userId) => {
    return fetch(`/api/guides/${guideId}/assign/${userId}`, { method: 'POST' });
  },

  unassignUserFromGuide: async (guideId, userId) => {
    return fetch(`/api/guides/${guideId}/unassign/${userId}`, { method: 'DELETE' });
  }
};

export default userApi;