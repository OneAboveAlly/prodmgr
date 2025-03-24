import React, { createContext, useState, useContext, useEffect } from 'react';
import authApi from '../api/auth.api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        try {
          const response = await authApi.me();
          setUser(response.data);
        } catch (err) {
          localStorage.removeItem('accessToken');
        }
      }
      
      setLoading(false);
    };
    
    initAuth();
  }, []);
  
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authApi.login(credentials);
      
      localStorage.setItem('accessToken', response.data.accessToken);
      setUser(response.data.user);
      return response.data;
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
      throw err;
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
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  const hasPermission = (module, action) => {
    if (!user || !user.permissions) return false;
    return user.permissions.some(permission => 
      permission.module === module && permission.action === action
    );
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
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}