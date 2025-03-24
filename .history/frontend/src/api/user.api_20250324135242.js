import api from '../services/api.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/users`;

const userApi = {
  // Get all users with pagination - ensure we return consistent format
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
    // Normalize response to always return users as an array
    if (response.data?.users) {
      return response.data;

    }
    return response;
  },
  
  // Get a single user by ID
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  
  // Create a new user
  create: async (userData) => {
    // Ensure isActive is set to true by default
    if (userData.isActive === undefined) {
      userData.isActive = true;
    }
    
    const response = await api.post(BASE_URL, userData);
    // Normalize response
    return response;
  },
  
  // Update a user
  update: (id, userData) => api.put(`${BASE_URL}/${id}`, userData),
  
  // Delete a user
  delete: (id) => api.delete(`${BASE_URL}/${id}`)
};

export default userApi;