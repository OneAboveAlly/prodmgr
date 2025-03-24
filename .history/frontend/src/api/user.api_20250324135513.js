// src/api/user.api.js
import api from '../services/api.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/users`;

const userApi = {
  // Get all users with pagination - zwracamy pełne dane
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
    return response.data; // <-- WAŻNE! Zwraca { users: [], pagination: {...} }
  },

  // Get a single user by ID
  getById: (id) => api.get(`${BASE_URL}/${id}`),

  // Create a new user
  create: async (userData) => {
    // Domyślnie ustawiamy użytkownika jako aktywnego
    if (userData.isActive === undefined) {
      userData.isActive = true;
    }

    const response = await api.post(BASE_URL, userData);
    return response.data;
  },

  // Update a user
  update: (id, userData) => api.put(`${BASE_URL}/${id}`, userData),

  // Delete a user
  delete: (id) => api.delete(`${BASE_URL}/${id}`)
};

export default userApi;
