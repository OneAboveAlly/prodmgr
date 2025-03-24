import api from '../services/api.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const BASE_URL = `${API_URL}/users`;

const userApi = {
  // Get all users with pagination
  getAll: (page = 1, limit = 10) => 
    api.get(`${BASE_URL}?page=${page}&limit=${limit}`),
  
  // Get a single user by ID
  getById: (id) => api.get(`${BASE_URL}/${id}`),
  
  // Create a new user
  create: (userData) => api.post(BASE_URL, userData),
  
  // Update a user
  update: (id, userData) => api.put(`${BASE_URL}/${id}`, userData),
  
  // Delete a user
  delete: (id) => api.delete(`${BASE_URL}/${id}`)
};

export default userApi;