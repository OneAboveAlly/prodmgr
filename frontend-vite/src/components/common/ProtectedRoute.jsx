// frontend/src/components/common/ProtectedRoute.js
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function ProtectedRoute({ children, requiredPermission }) {
  const { isAuthenticated, isReady, hasPermission, loading, user } = useAuth();
  
  // Dodaj funkcję debugowania uprawnień
  useEffect(() => {
    if (isReady && requiredPermission && user) {
      // Sprawdź, czy uprawnienie jest przekazane jako tablica czy string z kropką
      const module = Array.isArray(requiredPermission) 
        ? requiredPermission[0] 
        : requiredPermission.split('.')[0];
      const action = Array.isArray(requiredPermission) 
        ? requiredPermission[1] 
        : requiredPermission.split('.')[1];
      
      const permKey = `${module}.${action}`;
      const hasAccess = hasPermission(module, action);
      
      console.log(`------- Permission Debug -------`);
      console.log(`Route requiring: ${permKey}`);
      console.log(`User: ${user.firstName} ${user.lastName}`);
      console.log(`Roles: ${user.roles.map(r => r.name).join(', ')}`);
      console.log(`Has permission? ${hasAccess ? 'YES' : 'NO'}`);
      console.log(`Available permissions:`, user.permissions);
      console.log(`-------------------------------`);
    }
  }, [isReady, requiredPermission, user, hasPermission]);

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
    // Dodatkowy log dla braku uprawnień
    console.warn(`Access denied to route requiring: ${Array.isArray(requiredPermission) ? requiredPermission.join('.') : requiredPermission}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;