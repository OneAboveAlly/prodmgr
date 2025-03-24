import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import authApi from '../api/auth.api';

const AuthContext = createContext();

// Maksymalna liczba prób odświeżenia tokenu
const MAX_REFRESH_ATTEMPTS = 2;
// Odświeżaj token na 5 minut przed wygaśnięciem (zakładając że token żyje 30 minut)
const REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minut

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  
  // Użycie referencji zamiast stanu dla licznika i timera
  // aby uniknąć problemów z zamknięciami (closures)
  const refreshAttemptsRef = useRef(0);
  const refreshTimerRef = useRef(null);

  // Pomocnicza funkcja do czyszczenia stanu po wylogowaniu
  const clearAuthState = useCallback(() => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setPermissions({});
    setRefreshAttempts(0);
    refreshAttemptsRef.current = 0;
    
    // Wyczyść timer odświeżania jeśli istnieje
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);
  
  // Funkcja do pobierania danych użytkownika
  const fetchUserData = useCallback(async () => {
    try {
      const response = await authApi.me();
      if (response.data) {
        setUser(response.data);
        
        // Wyodrębnij uprawnienia jeśli są dostępne
        if (response.data.permissions) {
          setPermissions(response.data.permissions);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return false;
    }
  }, []);
  
  // Funkcja do odświeżania tokenu dostępowego
  const refreshAccessToken = useCallback(async () => {
    // Zapobiegaj zbyt wielu próbom odświeżenia
    if (refreshAttemptsRef.current >= MAX_REFRESH_ATTEMPTS) {
      console.warn('Maximum refresh attempts reached, logging out');
      // Automatyczne wylogowanie po przekroczeniu maksymalnej liczby prób
      clearAuthState();
      return false;
    }
    
    // Zapobiegaj równoległym operacjom odświeżania
    if (isRefreshing) return false;
    
    try {
      setIsRefreshing(true);
      // Aktualizuj zarówno stan, jak i referencję
      setRefreshAttempts(prev => prev + 1);
      refreshAttemptsRef.current += 1;
      
      const response = await authApi.refreshToken();
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        // Resetuj licznik prób po sukcesie
        setRefreshAttempts(0);
        refreshAttemptsRef.current = 0;
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, clearAuthState]);
  
  // Inicjalizacja auth przy montowaniu komponentu
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      if (!isMounted) return;
      setLoading(true);
      
      try {
        let token = localStorage.getItem('accessToken');
        let authSuccessful = false;
        
        // Jeśli token istnieje, spróbuj go użyć
        if (token) {
          const userFetched = await fetchUserData();
          if (userFetched) {
            authSuccessful = true;
          }
        }
        
        // Brak tokenu lub token nieprawidłowy - spróbuj odświeżyć
        if (!authSuccessful) {
          const refreshed = await refreshAccessToken();
          
          if (refreshed && isMounted) {
            // Jeśli token został odświeżony, spróbuj ponownie pobrać dane użytkownika
            await fetchUserData();
          } else if (isMounted) {
            // Jeśli odświeżenie się nie powiodło, wyczyść stan uwierzytelniania
            clearAuthState();
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          clearAuthState();
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    initAuth();
    
    return () => {
      isMounted = false;
      // Wyczyść timer przy odmontowaniu
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchUserData, refreshAccessToken, clearAuthState]);
  
  // Skonfiguruj okresowe odświeżanie tokenu
  useEffect(() => {
    // Konfiguruj timer odświeżania tylko jeśli użytkownik jest zalogowany
    if (!user) return;
    
    // Wyczyść istniejący timer przed ustawieniem nowego
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
    }
    
    // Ustaw nowy timer odświeżania
    refreshTimerRef.current = setInterval(async () => {
      // Nie próbuj odświeżać równolegle
      if (!isRefreshing) {
        await refreshAccessToken();
      }
    }, REFRESH_INTERVAL);
    
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [user, refreshAccessToken, isRefreshing]);
  
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login(credentials);
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        
        // Przechowuj uprawnienia, jeśli znajdują się w odpowiedzi
        if (response.data.user?.permissions) {
          setPermissions(response.data.user.permissions);
        }
        
        // Resetuj licznik prób po udanym logowaniu
        setRefreshAttempts(0);
        refreshAttemptsRef.current = 0;
        
        return response.data;
      } else {
        throw new Error('Access token not received');
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Login failed';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      clearAuthState();
    }
  };
  
  // Sprawdź czy użytkownik ma określony poziom uprawnień dla modułu/akcji
  const hasPermission = (module, action, level = 1) => {
    try {
      if (!user) return false;
      
      // Super admin ma wszystkie uprawnienia
      if (user.isSuperAdmin) return true;
      
      // Sprawdź czy uprawnienia istnieją w oczekiwanym formacie
      const permKey = `${module}.${action}`;
      
      // Najpierw sprawdź format strukturyzowany { module: { action: level } }
      if (permissions?.[module]?.[action] >= level) {
        return true;
      }
      
      // Następnie sprawdź format płaski { "module.action": level }
      if (permissions?.[permKey] >= level) {
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking permissions:', error);
      return false;
    }
  };
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshAccessToken,
        hasPermission,
        isAuthenticated: !!user,
        permissions
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}