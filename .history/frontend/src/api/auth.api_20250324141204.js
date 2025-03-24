import api from '../services/api.service';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const authApi = {
  login: (credentials) => api.post(`/auth/login`, credentials),
  logout: () => api.post(`/auth/logout`),
  me: () => api.get(`/auth/me`),
  refreshToken: () => api.post(`/auth/refresh-token`)
};

export default authApi;