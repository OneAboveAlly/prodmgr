import axios from 'axios';

// Setup axios instance
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // <== to jest KLUCZOWE!
  headers: {
    'Content-Type': 'application/json'
  },
 
});

// Response interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor for responses
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If error is 401 and we haven't tried to refresh token yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token using direct axios call to avoid circular dependency
        const refreshResponse = await axios.post(
          `${API_URL}/auth/refresh-token`,
          {},
          { withCredentials: true }
        );
        
        const newAccessToken = refreshResponse.data.accessToken;
        
        if (newAccessToken) {
          // Store the new token
          localStorage.setItem('accessToken', newAccessToken);
          
          // Update the Authorization header
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
          
          // Retry the original request
          return api(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // If refresh fails, we might need to redirect to login
        localStorage.removeItem('accessToken');
        
        // We should let the AuthContext handle the redirect instead of doing it here
        // This prevents redirect loops and keeps the auth logic centralized
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;