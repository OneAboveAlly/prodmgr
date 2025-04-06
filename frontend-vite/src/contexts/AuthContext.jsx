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

        // Zapisz ID użytkownika do localStorage dla Socket.io
        if (response.data && response.data.id) {
          localStorage.setItem('userId', response.data.id);
        }

        setUser(response.data);
      } catch (err) {
        console.warn('Token invalid or expired');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('userId');
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
  
      // Fetch full user info after login
      const meResponse = await authApi.me();
      
      // Store user ID and full user object for permission checks
      if (meResponse.data && meResponse.data.id) {
        localStorage.setItem('userId', meResponse.data.id);
        localStorage.setItem('user', JSON.stringify(meResponse.data));
      }
      
      setUser(meResponse.data);
      return meResponse.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
      setIsReady(true); // Ensure readiness after login
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('userId'); // Usuń userId przy wylogowaniu
      setUser(null);
    }
  };

  const hasPermission = (module, action, level = 1) => {
    if (!user || !user.permissions) return false;

    // Check for admin roles first
    if (user.roles && user.roles.some(role => 
      role.name === 'Admin' || role.name === 'Administrator')
    ) {
      return true;
    }
    
    // Check for admin-level permissions that bypass regular permission checks
    if (user.permissions['admin.access'] >= 2) {
      return true;
    }
    
    // For roles.* permissions, also check if user has admin.access permission
    if (module === 'roles' && user.permissions['admin.access'] >= 1) {
      return true;
    }
    
    // Check for the specific permission
    const key = `${module}.${action}`;
    if (user.permissions[key] >= level) {
      return true;
    }
    
    // Check for wildcard permissions (e.g., module.*)
    const wildcardKey = `${module}.*`;
    if (user.permissions[wildcardKey] >= level) {
      return true;
    }
    
    // Check for global wildcard permissions (*.*)
    if (user.permissions['*.*'] >= level) {
      return true;
    }
    
    // If we have module.manage permission with higher level, it implies other permissions
    if (action !== 'manage' && user.permissions[`${module}.manage`] >= level + 1) {
      return true;
    }
    
    return false;
  };

  const refetchMe = async () => {
    try {
      const response = await authApi.me();
      console.log('🔁 /auth/me response:', response.data);

      // Aktualizacja userId jeśli zmieniły się dane użytkownika
      if (response.data && response.data.id) {
        localStorage.setItem('userId', response.data.id);
      }

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
        refetchMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
