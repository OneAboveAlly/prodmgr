import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Spinner from '../common/Spinner';
import { PRODUCTION_PERMISSIONS, hasProductionPermission } from '../../utils/permissionUtils';

/**
 * Enhanced protected route component with granular permission support
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components to render if authorized
 * @param {Object} props.permission - Permission object from PRODUCTION_PERMISSIONS
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (default: /login)
 * @param {boolean} props.showUnauthorized - Whether to show unauthorized page instead of redirecting
 * @returns {React.ReactNode}
 */
const EnhancedProtectedRoute = ({ 
  children, 
  permission,
  redirectTo = '/login',
  showUnauthorized = false
}) => {
  const { isAuthenticated, isReady, user } = useAuth();
  const location = useLocation();

  // Show loading while auth state is being initialized
  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner label="Checking authorization..." />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If permission is required, check it
  if (permission) {
    const hasPermission = hasProductionPermission(user, permission);
    
    if (!hasPermission) {
      if (showUnauthorized) {
        return (
          <div className="max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-md mt-12">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
            <p className="mb-4">
              You don't have the required permissions to access this page.
            </p>
            <p className="mb-4">
              Required permission: <code className="bg-gray-100 px-2 py-1 rounded">{permission.module}.{permission.action}</code> (level {permission.level})
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Go Back
              </button>
            </div>
          </div>
        );
      }
      
      return <Navigate to="/unauthorized" state={{ from: location }} replace />;
    }
  }

  return children;
};

export default EnhancedProtectedRoute;