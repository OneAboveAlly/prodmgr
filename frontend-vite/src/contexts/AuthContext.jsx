import React, { createContext, useState, useContext, useEffect } from 'react';
import authApi from '../api/auth.api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isReady, setIsReady] = useState(false);

  const initAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const response = await authApi.me();
        console.log('🔁 /auth/me response:', response.data);

        setUser(response.data);
      } catch (err) {
        console.warn('Token invalid or expired');
        localStorage.removeItem('accessToken');
        setUser(null);
      }
    }
    setLoading(false);
    setIsReady(true);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authApi.login(credentials);
  
      localStorage.setItem('accessToken', response.data.accessToken);
  
      // ⬇️ Pobierz pełne info o użytkowniku po zalogowaniu
      const meResponse = await authApi.me();
      setUser(meResponse.data);
  
      return meResponse.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
      setIsReady(true); // <- dodaj to na wypadek, gdy logowanie jest pierwszym wejściem
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  const hasPermission = (module, action, level = 1) => {
    if (!user || !user.permissions) return false;

    if (user.roles && user.roles.some(role => role.name === 'Admin')) {
      return true;
    }

    const key = `${module}.${action}`;
    return user.permissions[key] >= level;
  };

  const refetchMe = async () => {
    try {
      const response = await authApi.me();
      console.log('🔁 /auth/me response:', response.data);

      setUser(response.data);
    } catch (err) {
      console.warn('Failed to refresh user data', err);
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
        isAuthenticated: !!user,
        hasPermission,
        isReady,
        refetchMe, // <--- eksportujemy refetch
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
