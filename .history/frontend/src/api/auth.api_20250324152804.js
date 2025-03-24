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

// Dodajemy interceptor dla debugowania ciasteczek
authAxios.interceptors.request.use(
  config => {
    console.log('Sending request to:', config.url, 'with withCredentials:', config.withCredentials);
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor dla odpowiedzi - tylko do debugowania
authAxios.interceptors.response.use(
  response => {
    console.log('Received response from:', response.config.url, 'status:', response.status);
    return response;
  },
  error => {
    console.error('Error response from:', error.config?.url, 'status:', error.response?.status, 'message:', error.message);
    return Promise.reject(error);
  }
);

const authApi = {
  // Używamy dedykowanej instancji dla wszystkich operacji uwierzytelniania,
  // aby zapewnić poprawną obsługę ciasteczek
  login: (credentials) => authAxios.post(`/auth/login`, credentials),
  logout: () => authAxios.post(`/auth/logout`),
  me: () => authAxios.get(`/auth/me`),
  
  // Szczególnie ważne dla refresh token - musi używać dedykowanej instancji
  // z włączonym withCredentials
  refreshToken: () => authAxios.post(`/auth/refresh-token`)
};

export default authApi;