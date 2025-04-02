// Poprawiony plik: src/api/inventory.api.js
import api from '../services/api.service';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const inventoryApi = {
  getInventoryItems: ({ page = 1, limit = 20, search = '', category = '', lowStock = false }) => {
    const params = new URLSearchParams({
      page,
      limit,
      search,
      category,
      lowStock: lowStock ? 'true' : ''
    });
    return api.get(`/inventory/items?${params.toString()}`)
      .then(res => res.data);
  },

  createInventoryItem: (formData) => {
    return api.post('/inventory/items', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }).then(res => res.data);
  },

  getInventoryItemById: (id) => api.get(`/inventory/items/${id}`).then(res => res.data),

  getInventoryReport: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return api.get(`/inventory/report?${params.toString()}`).then(res => res.data);
  },

  addQuantity: (id, payload) => api.post(`/inventory/items/${id}/add`, payload).then(res => res.data),
  removeQuantity: (id, payload) => api.post(`/inventory/items/${id}/remove`, payload).then(res => res.data),

  deleteItem: (id) => api.delete(`/inventory/items/${id}`).then(res => res.data),

  getItemTransactions: (id, page = 1, limit = 20) => {
    return api.get(`/inventory/items/${id}/transactions?page=${page}&limit=${limit}`).then(res => res.data);
  },

  getAllInventoryTransactions: (filters = {}) => {
    const params = new URLSearchParams();
    for (const key in filters) {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    }
    return api.get(`/inventory/transactions/all?${params.toString()}`)
      .then(res => ({ 
        transactions: res.data.transactions || [], 
        pagination: res.data.pagination || { page: 1, pages: 1 },
      }));
  },

  updateInventoryItem: (id, data) => api.put(`/inventory/items/${id}`, data).then(res => res.data),
};

export default inventoryApi;