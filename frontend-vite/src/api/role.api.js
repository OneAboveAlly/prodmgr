import api from '../services/api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/roles`;

const roleApi = {
  getAll: async (page = 1, limit = 10) => {
    const response = await api.get(`${BASE_URL}?page=${page}&limit=${limit}`);
    if (response.data?.roles) {
      return response.data;
    }
    return { roles: [], pagination: { total: 0, page, limit, pages: 0 } };
  },

  getById: (id) => api.get(`${BASE_URL}/${id}`),
  create: (roleData) => api.post(BASE_URL, roleData),
  update: (id, roleData) => api.put(`${BASE_URL}/${id}`, roleData),
  delete: (id) => api.delete(`${BASE_URL}/${id}`),
  getAllPermissions: (forceRefresh = false) => api.get(`${BASE_URL}/permissions${forceRefresh ? '?refresh=true' : ''}`),
  refreshPermissionsCache: () => api.post(`${BASE_URL}/permissions/refresh`)
};

export default roleApi;
