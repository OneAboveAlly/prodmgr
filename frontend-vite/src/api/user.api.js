import api from '../services/api.service';

const userApi = {
  getAll: async (page = 1, limit = 10) => {
    try {
      const response = await api.get('/users', { 
        params: { page, limit } 
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },
  getById: async (id) => {
    try {
      const response = await api.get(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },
  create: async (userData) => {
    try {
      const response = await api.post('/users', userData);
      return response.data;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },
  update: async (id, userData) => {
    try {
      const response = await api.put(`/users/${id}`, userData);
      return response.data;
    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      throw error;
    }
  },
  delete: async (id) => {
    try {
      const response = await api.delete(`/users/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw error;
    }
  },
  
  // Metody do zarządzania własnym profilem
  updateMyProfile: async (userData) => {
    try {
      const response = await api.put('/users/profile', userData);
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
  changePassword: async (data) => {
    try {
      const response = await api.put('/users/password', data);
      return response.data;
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  },

  getUsersByRole: async (roleName) => {
    try {
      const response = await api.get(`/users/role/${roleName}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching users with role ${roleName}:`, error.response?.status || error.message);
      throw error;
    }
  },

  // New methods
  fetchAllUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data;
    } catch (error) {
      console.error('Error fetching all users:', error.response?.status || error.message);
      throw error;
    }
  },

  assignUserToGuide: async (guideId, userId) => {
    return api.post(`/guides/${guideId}/assign/${userId}`);
  },

  unassignUserFromGuide: async (guideId, userId) => {
    return api.delete(`/guides/${guideId}/unassign/${userId}`);
  }
};

export default userApi;