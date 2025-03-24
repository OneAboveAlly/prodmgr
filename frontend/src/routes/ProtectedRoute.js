// src/components/common/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, isReady, hasPermission, loading } = useAuth();

  // ⏳ Poczekaj, aż auth się załaduje (isReady daje pewność że user i permissions są dostępne)
  if (!isReady || loading) {
    return <div className="p-8 text-center text-gray-500">Checking access...</div>;
  }

  // 🔐 Niezalogowany → redirect
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // 🚫 Brak wymaganych uprawnień
  if (
    requiredPermission &&
    (!Array.isArray(requiredPermission)
      ? !hasPermission(...requiredPermission.split('.')) // np. "roles.update"
      : !hasPermission(...requiredPermission)) // lub ['roles', 'update']
  ) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
