Comprehensive Fix for Permission Issues
This document outlines the necessary changes to fix the permission issues in your application where users with appropriate permissions are still being denied access to certain routes or components.
Key Issues Identified

The current permission system isn't recognizing users with admin.access permissions as having full permissions
The hasPermission function doesn't account for wildcard permissions or permission inheritance
The ProtectedRoute component doesn't check for admin-level access before denying routes

Implementation Steps
1. Update the hasPermission Function in AuthContext
Replace the current hasPermission function in frontend-vite/src/contexts/AuthContext.jsx with the enhanced version:
javascriptCopyconst hasPermission = (module, action, level = 1) => {
  if (!user || !user.permissions) return false;

  // Check for admin roles first
  if (user.roles && user.roles.some(role => 
    role.name === 'Admin' || role.name === 'Administrator')
  ) {
    return true;
  }
  
  // Check for admin-level permissions that bypass regular permission checks
  // Users with admin.access at level 2 or higher can access everything
  if (user.permissions['admin.access'] >= 2) {
    return true;
  }
  
  // For roles.* permissions, also check if user has admin.access permission
  if (module === 'roles' && user.permissions['admin.access'] >= 1) {
    return true;
  }
  
  // Check for the specific permission
  const key = `${module}.${action}`;
  
  // First check direct permission
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
2. Update the ProtectedRoute Component
Replace the code in frontend-vite/src/components/common/ProtectedRoute.jsx with the updated version that includes better debugging and handling of admin permissions.
3. Update the Backend getUserPermissions Function
Replace the getUserPermissions function in backend/src/services/auth.service.js to properly handle admin roles and wildcard permissions.

// src/components/common/ProtectedRoute.js
import React, { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, isReady, hasPermission, loading, user } = useAuth();
  
  // Debug function - keep this to help track permission issues
  useEffect(() => {
    if (isReady && requiredPermission && user) {
      // Check if permission is passed as array or string with dot
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
      
      // NEW: Add additional debug for this specific permission
      console.log(`Permission value for ${permKey}: ${user.permissions[permKey] || 'undefined'}`);
      
      // NEW: Check for admin-level permission
      const hasAdminAccess = user.permissions['admin.access'] || 0;
      console.log(`Admin access level: ${hasAdminAccess}`);
      
      // NEW: Check each role for implicit permissions
      if (user.roles && user.roles.length > 0) {
        console.log('Checking role permissions:');
        user.roles.forEach(role => {
          console.log(`Role: ${role.name}`);
        });
      }
      
      console.log(`-------------------------------`);
    }
  }, [isReady, requiredPermission, user, hasPermission]);

  // Wait for auth to load (isReady ensures user and permissions are available)
  if (!isReady || loading) {
    return <div className="p-8 text-center text-gray-500">Checking access...</div>;
  }

  // Not logged in → redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // NEW: Special handling for admin users with admin.access permission
  if (requiredPermission && user && user.permissions) {
    const adminAccessLevel = user.permissions['admin.access'] || 0;
    if (adminAccessLevel >= 2) {
      console.log('Admin access detected. Bypassing permission check.');
      return children;
    }
  }

  // Lacking required permissions
  if (
    requiredPermission &&
    (!Array.isArray(requiredPermission)
      ? !hasPermission(...requiredPermission.split('.')) // e.g., "roles.update"
      : !hasPermission(...requiredPermission)) // or ['roles', 'update']
  ) {
    // Log the denial for debugging
    console.warn(`Access denied to route requiring: ${Array.isArray(requiredPermission) ? requiredPermission.join('.') : requiredPermission}`);
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;

const hasPermission = (module, action, level = 1) => {
  if (!user || !user.permissions) return false;

  // Check for admin roles first
  if (user.roles && user.roles.some(role => 
    role.name === 'Admin' || role.name === 'Administrator')
  ) {
    return true;
  }
  
  // Check for admin-level permissions that bypass regular permission checks
  // Users with admin.access at level 2 or higher can access everything
  if (user.permissions['admin.access'] >= 2) {
    return true;
  }
  
  // For roles.* permissions, also check if user has admin.access permission
  if (module === 'roles' && user.permissions['admin.access'] >= 1) {
    return true;
  }
  
  // Check for the specific permission
  const key = `${module}.${action}`;
  
  // First check direct permission
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


const getUserPermissions = async (userId) => {
  // Check if user has any role with name 'Admin' or 'Administrator'
  const adminRole = await prisma.userRole.findFirst({
    where: {
      userId,
      role: {
        name: {
          in: ['Admin', 'Administrator']
        }
      }
    }
  });

  if (adminRole) {
    // If user is admin, give all permissions with level 3 (highest)
    const allPermissions = await prisma.permission.findMany();
    const permissionMap = {};
    
    // Add normal permissions
    allPermissions.forEach(p => {
      permissionMap[`${p.module}.${p.action}`] = 3;
    });
    
    // Add special wildcard permissions
    permissionMap['*.*'] = 3;          // Global wildcard (all modules, all actions)
    permissionMap['admin.access'] = 3; // Special admin permission
    
    return permissionMap;
  }

  // For non-admin users, start with role permissions
  const rolePermissions = await prisma.$queryRaw`
    SELECT p.module, p.action, MAX(rp.value) as value
    FROM "UserRole" ur
    JOIN "RolePermission" rp ON ur."roleId" = rp."roleId"
    JOIN "Permission" p ON rp."permissionId" = p.id
    WHERE ur."userId" = ${userId}
    GROUP BY p.module, p.action
  `;

  // Then add direct user permissions (these override role permissions)
  const userPermissions = await prisma.$queryRaw`
    SELECT p.module, p.action, up.value
    FROM "UserPermission" up
    JOIN "Permission" p ON up."permissionId" = p.id
    WHERE up."userId" = ${userId}
  `;

  // Build the permission map
  const permissionMap = {};
  
  // Add role permissions first
  rolePermissions.forEach(p => {
    permissionMap[`${p.module}.${p.action}`] = p.value;
  });
  
  // Then add user permissions (overriding role permissions if present)
  userPermissions.forEach(p => {
    permissionMap[`${p.module}.${p.action}`] = p.value;
  });
  
  // Special handling for wildcard permissions if needed
  // If user has any permission with high level (2+), also add that module's wildcard
  const modules = [...new Set([...rolePermissions, ...userPermissions].map(p => p.module))];
  modules.forEach(module => {
    const highLevelPerms = Object.entries(permissionMap)
      .filter(([key, value]) => key.startsWith(`${module}.`) && value >= 2);
    
    if (highLevelPerms.length > 0) {
      // If user has any high-level permission for this module, add module-level wildcard
      if (!permissionMap[`${module}.*`] || permissionMap[`${module}.*`] < 2) {
        permissionMap[`${module}.*`] = 2;
      }
    }
  });

  return permissionMap;
};


After implementing these changes, your permission system will be much more flexible and will properly recognize users with admin-level access, ensuring they can access all parts of the application regardless of their specific permission settings.