import api from '../services/api.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const BASE_URL = `${API_URL}/leave`;

const leaveApi = {
  getLeaveTypes: () => api.get(`${BASE_URL}/types`),
  createLeaveType: (leaveTypeData) => api.post(`${BASE_URL}/types`, leaveTypeData),
  updateLeaveType: (id, leaveTypeData) => api.put(`${BASE_URL}/types/${id}`, leaveTypeData),
  deleteLeaveType: (id) => api.delete(`${BASE_URL}/types/${id}`),

  requestLeave: (leaveData) => api.post(`${BASE_URL}/request`, leaveData),
  updateLeaveRequest: (id, leaveData) => api.put(`${BASE_URL}/request/${id}`, leaveData),
  approveLeave: (id, notes) => api.post(`${BASE_URL}/request/${id}/approve`, { notes }),
  rejectLeave: (id, notes) => api.post(`${BASE_URL}/request/${id}/reject`, { notes }),
  deleteLeaveRequest: (id) => api.delete(`${BASE_URL}/request/${id}`),

  getUserLeaves: (page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`${BASE_URL}/requests?${params.toString()}`);
  },
  getUserLeavesById: (userId, page = 1, limit = 10, filters = {}) => {
    const params = new URLSearchParams({ page, limit, ...filters });
    return api.get(`${BASE_URL}/requests/user/${userId}?${params.toString()}`);
  },
  getPendingLeaves: (page = 1, limit = 10) => {
    const params = new URLSearchParams({ page, limit });
    return api.get(`${BASE_URL}/requests/pending?${params.toString()}`);
  }
};

export default leaveApi;
