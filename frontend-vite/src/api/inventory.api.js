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
  
  /**
   * Pobiera ilość z magazynu
   * @param {string} id - ID przedmiotu
   * @param {Object} payload - Dane do wysłania
   * @param {number} payload.quantity - Ilość do pobrania
   * @param {string} payload.reason - Powód pobrania (opcjonalnie)
   * @param {boolean} payload.removeReserved - Czy pobierać z zarezerwowanych (opcjonalnie)
   * @returns {Promise} - Promise z danymi odpowiedzi
   */
  removeQuantity: (id, payload) => api.post(`/inventory/items/${id}/remove`, payload).then(res => res.data),
  
  /**
   * Koryguje ilość przedmiotu w magazynie
   * @param {string} id - ID przedmiotu
   * @param {Object} payload - Dane do wysłania
   * @param {number} payload.quantity - Nowa ilość przedmiotu
   * @param {string} payload.reason - Powód korekty (opcjonalnie)
   * @returns {Promise} - Promise z danymi odpowiedzi
   */
  adjustQuantity: (id, payload) => api.post(`/inventory/items/${id}/adjust`, payload).then(res => res.data),

  deleteItem: (id) => api.delete(`/inventory/items/${id}`).then(res => res.data),

  getItemTransactions: (id, page = 1, limit = 20) => {
    return api.get(`/inventory/items/${id}/transactions?page=${page}&limit=${limit}`).then(res => res.data);
  },

  getAllInventoryTransactions: (filters = {}) => {
    const params = new URLSearchParams();
    
    // Upewnij się, że dodajemy wszystkie parametry, włącznie z paginacją
    for (const key in filters) {
      if (filters[key] !== undefined && filters[key] !== '') {
        params.append(key, filters[key]);
      }
    }
    
    // Upewnij się, że mamy page i limit
    if (!params.has('page') && filters.page) {
      params.append('page', filters.page);
    }
    
    if (!params.has('limit') && filters.limit) {
      params.append('limit', filters.limit);
    }
    
    console.log('API call params:', filters);
    console.log('Final URL params:', params.toString());
    
    return api.get(`/inventory/transactions/all?${params.toString()}`)
      .then(res => {
        console.log('API raw response:', res);
        return { 
          transactions: res.data.transactions || [], 
          pagination: res.data.pagination || { page: 1, pages: 1 },
        };
      })
      .catch(err => {
        console.error('API error:', err);
        throw err;
      });
  },

  updateInventoryItem: (id, data) => api.put(`/inventory/items/${id}`, data).then(res => res.data),
};

export default inventoryApi;