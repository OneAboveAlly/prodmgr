import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const authApi = {
  login: (credentials) => axios.post(`${API_URL}/auth/login`, credentials),
  logout: () => axios.post(`${API_URL}/auth/logout`),
  me: () => axios.get(`${API_URL}/auth/me`),
  refreshToken: () => axios.post(`${API_URL}/auth/refresh-token`)
};

export default authApi;