import axios from 'axios';

// Setup axios instance
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Flag to track if we're already refreshing to prevent loops
let isRefreshingToken = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Send cookies with cross-origin requests
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
    
    // Prevent infinite loops - if this request is already a retry or
    // it's specifically a refresh token call that failed
    if (
      !error.response || 
      error.response.status !== 401 || 
      originalRequest._retry || 
      originalRequest.url === '/auth/refresh-token'
    ) {
      return Promise.reject(error);
    }
    
    // Set retry flag
    originalRequest._retry = true;
    
    if (isRefreshingToken) {
      // If already refreshing, wait for it to complete
      try {
        const token = await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    
    isRefreshingToken = true;
    
    try {
      // Try to refresh token using direct axios call to avoid circular dependency
      const refreshResponse = await axios.post(
        `${API_URL}/auth/refresh-token`,
        {},
        { 
          withCredentials: true,
          // Don't auto-retry this specific request to prevent loops
          maxRedirects: 0,
        }
      );
      
      const newAccessToken = refreshResponse?.data?.accessToken;
      
      if (newAccessToken) {
        // Store the new token
        localStorage.setItem('accessToken', newAccessToken);
        
        // Update original request headers
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Process pending requests
        processQueue(null, newAccessToken);
        
        // Retry the original request
        return api(originalRequest);
      } else {
        // No token returned - handle as error
        processQueue(new Error('No access token returned from refresh'));
        return Promise.reject(new Error('No access token returned from refresh'));
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      
      // Process queue with error
      processQueue(refreshError);
      
      // If refresh fails, we clear the token but don't redirect
      // Let AuthContext handle redirection
      localStorage.removeItem('accessToken');
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshingToken = false;
    }
  }
);

export default api;