import axios from 'axios';
import authApi from '../api/auth.api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Add this debugging interceptor to your API service
console.log('Setting up API service interceptors');

// Flaga do kontrolowania jednoczesnych prób odświeżenia tokena
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Tworzenie instancji axiosa z domyślną konfiguracją
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // KLUCZOWE dla ciasteczek refreshToken
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor dla requestów — dodajemy accessToken do każdego żądania
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('💡 Token dodany do requestu:', token);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor dla odpowiedzi — automatyczne odświeżenie tokena jeśli 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes('/auth/login') &&
      !originalRequest.url.includes('/auth/refresh-token')
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              originalRequest.headers.Authorization = 'Bearer ' + token;
              resolve(api(originalRequest));
            },
            reject: (err) => reject(err)
          });
        });
      }

      isRefreshing = true;

      try {
        const { data } = await authApi.refreshToken();

        const newToken = data?.accessToken;

        if (newToken) {
          localStorage.setItem('accessToken', newToken);
          api.defaults.headers.Authorization = `Bearer ${newToken}`;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return api(originalRequest);
        } else {
          throw new Error('No access token returned');
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Log detailed error information for debugging
    console.error('API Request Failed:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Special handling for 403 errors across the application
    if (error.response?.status === 403) {
      console.warn('Permission denied for request:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export default api;
