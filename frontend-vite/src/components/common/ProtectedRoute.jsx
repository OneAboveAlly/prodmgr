// frontend/src/components/common/ProtectedRoute.js
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, isReady, hasPermission, loading, user } = useAuth();
  
  useEffect(() => {
    if (isReady && requiredPermission && user) {
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
      console.log(`Permission value for ${permKey}: ${user.permissions[permKey] || 'undefined'}`);
      console.log(`Admin access level: ${user.permissions['admin.access'] || 0}`);
      console.log(`-------------------------------`);
    }
  }, [isReady, requiredPermission, user, hasPermission]);

  if (!isReady || loading) {
    return <div className="p-8 text-center text-gray-500">Checking access...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && user && user.permissions) {
    const adminAccessLevel = user.permissions['admin.access'] || 0;
    if (adminAccessLevel >= 2) {
      console.log('Admin access detected. Bypassing permission check.');
      return children;
    }
  }

  if (
    requiredPermission &&
    (!Array.isArray(requiredPermission)
      ? !hasPermission(...requiredPermission.split('.'))
      : !hasPermission(...requiredPermission))
  ) {
    console.warn(`Access denied to route requiring: ${Array.isArray(requiredPermission) ? requiredPermission.join('.') : requiredPermission}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;