import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PermissionDebugger from '../common/PermissionDebugger';

const MainLayout = ({ children }) => {
  const { user, logout, isReady, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Check if auth is ready before rendering the main layout
  if (!isReady) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-600 text-lg">Loading authentication...</div>
      </div>
    );
  }
  
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  // Navigation links with icon classes and permission requirements
  const navLinks = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'fas fa-tachometer-alt',
      permission: null
    },
    {
      name: 'Users',
      path: '/users',
      icon: 'fas fa-users',
      permission: 'users.read'
    },
    {
      name: 'Roles',
      path: '/roles',
      icon: 'fas fa-user-tag',
      permission: 'roles.read'
    },
    {
      name: 'Audit Logs',
      path: '/audit-logs',
      icon: 'fas fa-history',
      permission: 'auditLogs.read'
    },
    
    // Time tracking
    {
      name: 'Time Tracking',
      path: '/time-tracking',
      icon: 'fas fa-clock',
      permission: 'timeTracking.read' // Only users with this permission can see this
    },
    // Leave management
    {
      name: 'Leave Management',
      path: '/leave',
      icon: 'fas fa-calendar-alt',
      permission: 'leave.read' // Only users with this permission can see this
    }
    // Add more navigation links here as your application grows
  ];
  
  // Check if a nav link is currently active
  const isActivePath = (path) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };
  
  // Use the actual hasPermission function from AuthContext
  const checkPermission = (permission) => {
    if (!permission) return true; // No permission required
    return hasPermission(permission.split('.')[0], permission.split('.')[1]);
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-indigo-800 text-white transition-all duration-300 ease-in-out`}
      >
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-xl font-bold">Production Manager</h1>
          )}
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-full hover:bg-indigo-700 focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {sidebarOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 5l7 7-7 7M5 5l7 7-7 7"
                />
              )}
            </svg>
          </button>
        </div>
        
        <nav className="mt-5">
          <ul>
            {navLinks.map(
              (link) =>
                checkPermission(link.permission) && (
                  <li key={link.path} className="mb-2">
                    <Link
                      to={link.path}
                      className={`flex items-center px-4 py-3 ${
                        isActivePath(link.path)
                          ? 'bg-indigo-900 border-l-4 border-white'
                          : 'hover:bg-indigo-700'
                      }`}
                    >
                      <i className={`${link.icon} w-5 h-5 mr-3`}></i>
                      {sidebarOpen && <span>{link.name}</span>}
                    </Link>
                  </li>
                )
            )}
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex">
                <div className="flex-shrink-0 flex items-center">
                  {/* You can add a small logo here */}
                </div>
              </div>
              
              {/* User menu */}
              <div className="flex items-center">
                <div className="ml-3 relative">
                  <div className="flex items-center">
                    <span className="mr-3 text-sm font-medium text-gray-700">
                      {user?.firstName} {user?.lastName}
                    </span>
                    <button
                      onClick={handleLogout}
                      className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-gray-100">
          <div className="py-6">
            {children}
          </div>
        </main>

        {/* Permission Debugger */}
        <PermissionDebugger />
        
      </div>
    </div>
  
);
  
};

export default MainLayout;