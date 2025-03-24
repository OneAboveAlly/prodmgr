import api from '../services/api.service';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Tworzenie osobnej instancji axios dla operacji uwierzytelniania
// aby uniknąć cyklicznych zależności w interceptorach
const authAxios = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Zawsze wysyłaj ciasteczka
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

const authApi = {
  // Używamy standardowej instancji api dla większości wywołań
  // api.service.js już ma skonfigurowane withCredentials: true
  login: (credentials) => api.post(`/auth/login`, credentials),
  logout: () => api.post(`/auth/logout`),
  me: () => api.get(`/auth/me`),
  
  // Używamy dedykowanej instancji axios dla refresh token
  // aby uniknąć potencjalnych cyklicznych zależności
  refreshToken: () => authAxios.post(`/auth/refresh-token`)
};

export default authApi;