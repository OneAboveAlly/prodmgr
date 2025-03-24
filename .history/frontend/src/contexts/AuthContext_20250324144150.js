import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import authApi from '../api/auth.api';

const AuthContext = createContext();

// Maximum number of refresh attempts
const MAX_REFRESH_ATTEMPTS = 2;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [permissions, setPermissions] = useState({});
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  
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
    // Prevent too many refresh attempts
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      console.warn('Maximum refresh attempts reached');
      return false;
    }
    
    // Prevent concurrent refresh operations
    if (isRefreshing) return false;
    
    try {
      setIsRefreshing(true);
      setRefreshAttempts(prev => prev + 1);
      
      const response = await authApi.refreshToken();
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        // Reset attempts counter on success
        setRefreshAttempts(0);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error refreshing token:', err);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, refreshAttempts]);
  
  // Initialize auth on component mount
  useEffect(() => {
    let isMounted = true;
    
    const initAuth = async () => {
      if (!isMounted) return;
      setLoading(true);
      
      try {
        let token = localStorage.getItem('accessToken');
        let authSuccessful = false;
        
        // If token exists, try to use it
        if (token) {
          const userFetched = await fetchUserData();
          if (userFetched) {
            authSuccessful = true;
          }
        }
        
        // No token or token invalid - try refresh
        if (!authSuccessful) {
          const refreshed = await refreshAccessToken();
          
          if (refreshed && isMounted) {
            // If token refreshed, try getting user data again
            await fetchUserData();
          } else if (isMounted) {
            // If refresh failed, clear auth state
            localStorage.removeItem('accessToken');
            setUser(null);
            setPermissions({});
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        if (isMounted) {
          localStorage.removeItem('accessToken');
          setUser(null);
          setPermissions({});
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
    };
  }, [fetchUserData, refreshAccessToken]);
  
  // Set up periodic token refresh
  useEffect(() => {
    // Only set up refresh timer if user is logged in
    if (!user) return;
    
    // Refresh token 5 minutes before expiry
    // Assuming token expiry is 30 minutes, refresh every 25 minutes
    const REFRESH_INTERVAL = 25 * 60 * 1000; // 25 minutes
    
    const refreshTimer = setInterval(() => {
      refreshAccessToken();
    }, REFRESH_INTERVAL);
    
    return () => {
      clearInterval(refreshTimer);
    };
  }, [user, refreshAccessToken]);
  
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
        
        // Reset refresh attempts on successful login
        setRefreshAttempts(0);
        
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
      setRefreshAttempts(0);
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