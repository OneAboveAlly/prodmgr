import React, { createContext, useState, useContext, useEffect } from 'react';
import authApi from '../api/auth.api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permissions, setPermissions] = useState({});
  
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('accessToken');
      
      if (token) {
        try {
          const response = await authApi.me();
          setUser(response.data);
          // If user data includes permissions, set them
          if (response.data.permissions) {
            setPermissions(response.data.permissions);
          }
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
      
      // If login response includes permissions, set them
      if (response.data.permissions) {
        setPermissions(response.data.permissions);
      }
      
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
      setPermissions({});
    }
  };
  
  // Check if user has the specified permission level for a module/action
  const hasPermission = (module, action, level = 1) => {
    try {
      if (!user) return false;
      
      // Super admin has all permissions
      if (user.isSuperAdmin) return true;
      
      // Check if permissions exist in the expected format
      const permKey = `${module}.${action}`;
      
      // First try the structured format { module: { action: level } }
      if (permissions?.[module]?.[action] >= level) {
        return true;
      }
      
      // Then try the flat format { "module.action": level }
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
        hasPermission,
        permissions,
        isAuthenticated: !!user
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}