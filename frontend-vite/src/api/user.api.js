import api from '../services/api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/users`;

const userApi = {
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
    return response.data;
  },

  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (userData) => api.post(BASE_URL, userData),
  update: (id, userData) => api.put(`${BASE_URL}/${id}`, userData),
  delete: (id) => api.delete(`${BASE_URL}/${id}`)
};

export default userApi;
