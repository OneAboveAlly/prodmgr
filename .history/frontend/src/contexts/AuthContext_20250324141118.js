import React, { createContext, useState, useContext, useEffect } from 'react';
import authApi from '../api/auth.api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Function to fetch user data
  const fetchUserData = async () => {
    try {
      const response = await authApi.me();
      setUser(response.data);
      return true;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return false;
    }
  };
  
  // Function to refresh the access token
  const refreshAccessToken = async () => {
    if (isRefreshing) return false;
    
    try {
      setIsRefreshing(true);
      const response = await authApi.refreshToken();
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
  };
  
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        let token = localStorage.getItem('accessToken');
        let isAuthenticated = false;
        
        // If token doesn't exist, try to refresh it
        if (!token) {
          isAuthenticated = await refreshAccessToken();
        } else {
          isAuthenticated = true;
        }
        
        // If we have a valid token (existing or refreshed), fetch user data
        if (isAuthenticated) {
          const userFetched = await fetchUserData();
          if (!userFetched) {
            // If user data fetch failed, try refreshing the token once more
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              // If token refreshed successfully, try fetching user data again
              await fetchUserData();
            } else {
              // If refresh failed, clear token
              localStorage.removeItem('accessToken');
              setUser(null);
            }
          }
        } else {
          // No valid token or refresh failed
          localStorage.removeItem('accessToken');
          setUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
        localStorage.removeItem('accessToken');
        setUser(null);
        setError(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, []);
  
  const login = async (credentials) => {
    try {
      setLoading(true);
      const response = await authApi.login(credentials);
      
      if (response.data?.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        setUser(response.data.user);
        setError(null);
        return response.data;
      } else {
        throw new Error('Access token not received');
      }
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
  
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        refreshAccessToken,
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