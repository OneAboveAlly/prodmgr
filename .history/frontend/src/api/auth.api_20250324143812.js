import api from '../services/api.service';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const authApi = {
  // Use standard api instance for most calls
  login: (credentials) => api.post(`/auth/login`, credentials),
  logout: () => api.post(`/auth/logout`),
  me: () => api.get(`/auth/me`),
  
  // Use direct axios for refresh token to avoid potential circular dependencies
  // and ensure proper cookie handling
  refreshToken: () => axios.post(`${API_URL}/auth/refresh-token`, {}, { 
    withCredentials: true,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
};

export default authApi;