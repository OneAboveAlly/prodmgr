import axios from 'axios';

// Konfiguracja instancji axios
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Flagi do śledzenia stanu odświeżania tokenu
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
  withCredentials: true, // Wysyłaj ciasteczka we wszystkich żądaniach
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
});

// Interceptor dla żądań wychodzących
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

// Interceptor dla odpowiedzi
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Zapobiegaj nieskończonym pętlom - jeśli to już jest powtórka lub
    // to specyficznie błąd refresh token
    if (
      !error.response || 
      error.response.status !== 401 || 
      originalRequest._retry || 
      originalRequest.url === '/auth/refresh-token'
    ) {
      return Promise.reject(error);
    }
    
    // Ustaw flagę powtórki
    originalRequest._retry = true;
    
    if (isRefreshingToken) {
      // Jeśli już odświeżamy, poczekaj na zakończenie
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
      // Próba odświeżenia tokenu za pomocą bezpośredniego wywołania axios
      // aby uniknąć cyklicznej zależności
      const refreshResponse = await axios.post(
        `${API_URL}/auth/refresh-token`,
        {},
        { 
          withCredentials: true,
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      const newAccessToken = refreshResponse?.data?.accessToken;
      
      if (newAccessToken) {
        // Zapisz nowy token
        localStorage.setItem('accessToken', newAccessToken);
        
        // Aktualizuj nagłówki oryginalnego żądania
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        
        // Przetwórz kolejkę oczekujących żądań
        processQueue(null, newAccessToken);
        
        // Ponów oryginalne żądanie
        return api(originalRequest);
      } else {
        // Brak zwróconego tokenu - obsłuż jako błąd
        processQueue(new Error('Nie zwrócono tokenu dostępowego z odświeżenia'));
        localStorage.removeItem('accessToken');
        return Promise.reject(new Error('Nie zwrócono tokenu dostępowego z odświeżenia'));
      }
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
      
      // Przetwórz kolejkę z błędem
      processQueue(refreshError);
      
      // Jeśli odświeżenie się nie powiedzie, wyczyść token
      localStorage.removeItem('accessToken');
      
      // Opublikuj niestandardowe zdarzenie, aby powiadomić AuthContext
      window.dispatchEvent(new CustomEvent('auth:token-refresh-failed'));
      
      return Promise.reject(refreshError);
    } finally {
      isRefreshingToken = false;
    }
  }
);

export default api;