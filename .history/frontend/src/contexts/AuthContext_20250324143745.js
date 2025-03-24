import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authApi from '../api/auth.api';
import axios from 'axios';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissions, setPermissions] = useState({});
  
  // Function to fetch user data
  const fetchUserData = useCallback(async () => {
    try {
      const response = await authApi.me();
      if (response.data) {
        setUser(response.data);
        
        // Extract permissions if available
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
  
  // Function to refresh the access token
  const refreshAccessToken = useCallback(async () => {
    if (isRefreshing) return false;
    
    try {
      setIsRefreshing(true);
      // Using direct axios call to simplify debugging
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/refresh-token`,
        {}, 
        { 
          withCredentials: true,
          // Add some additional headers that might be required by your server
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing]);
  
  // Initialize auth on component mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        let token = localStorage.getItem('accessToken');
        
        // If no token in storage, try to refresh
        if (!token) {
          const refreshed = await refreshAccessToken();
          if (!refreshed) {
            // If refresh failed, just set loading to false and return
            setLoading(false);
            return;
          }
        }
        
        // At this point we either had a token or refreshed one successfully
        // Try to fetch user data
        const userFetched = await fetchUserData();
        
        if (!userFetched && token) {
          // If user fetch failed with an existing token, try refreshing
          const refreshed = await refreshAccessToken();
          if (refreshed) {
            // Try fetching user data again after refresh
            await fetchUserData();
          } else {
            // Clear auth state if everything failed
            localStorage.removeItem('accessToken');
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        // Clear on error
        localStorage.removeItem('accessToken');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, [fetchUserData, refreshAccessToken]);
  
  const login = async (credentials) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authApi.login(credentials);
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        
        // Store permissions if they're in the response
        if (response.data.user?.permissions) {
          setPermissions(response.data.user.permissions);
        }
        
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