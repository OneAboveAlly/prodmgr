import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import CreateUserPage from './pages/CreateUserPage';
import EditUserPage from './pages/EditUserPage';
import RolesPage from './pages/RolesPage';
import CreateRolePage from './pages/CreateRolePage';
import EditRolePage from './pages/EditRolePage';
import ViewRolePage from './pages/ViewRolePage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LeaveTypesPage from './pages/LeaveTypesPage';
import NotificationList from './modules/notifications/components/NotificationList';
import SendNotificationPage from './pages/SendNotificationPage';
import MessagesPage from './modules/chat/pages/MessagesPage';


// Add these route imports to the frontend/src/App.js file
import TimeTrackingPage from './pages/TimeTrackingPage';
import TimeTrackingSettingsPage from './pages/TimeTrackingSettingsPage';
import TimeTrackingReportsPage from './pages/TimeTrackingReportsPage';
import LeavePage from './pages/LeavePage';
import ActiveUsersPage from './pages/ActiveUsersPage';


// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            {/* Protected routes - wrapped in MainLayout */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <DashboardPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            {/* User management routes */}
            <Route
              path="/users"
              element={
                <ProtectedRoute requiredPermission={['users', 'view']}>
                  <MainLayout>
                    <UsersPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/users/new"
              element={
                <ProtectedRoute requiredPermission={['users', 'create']}>
                  <MainLayout>
                    <CreateUserPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/users/edit/:id"
              element={
                <ProtectedRoute requiredPermission={['users', 'update']}>
                  <MainLayout>
                    <EditUserPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Role management routes */}
            <Route
              path="/roles"
              element={
                <ProtectedRoute requiredPermission={['roles', 'view']}>
                  <MainLayout>
                    <RolesPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/roles/new"
              element={
                <ProtectedRoute requiredPermission={['roles', 'create']}>
                  <MainLayout>
                    <CreateRolePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/roles/edit/:id"
              element={
                <ProtectedRoute requiredPermission={['roles', 'update']}>
                  <MainLayout>
                    <EditRolePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/roles/:id"
              element={
                <ProtectedRoute requiredPermission={['roles', 'view']}>
                  <MainLayout>
                    <ViewRolePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications/send"
              element={
                <ProtectedRoute requiredPermission={['notifications', 'send']}>
                  <MainLayout>
                    <SendNotificationPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Messages route */}
            <Route
              path="/messages"
              element={
                <ProtectedRoute requiredPermission={['chat', 'view']}>
                  <MainLayout>
                    <MessagesPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Audit Logs route */}
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute requiredPermission={['auditLogs', 'read']}>
                  <MainLayout>
                    <AuditLogsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <NotificationList />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route 
              path="/notifications/send" 
              element={
                <ProtectedRoute requiredPermission={['notifications', 'create']}>
                  <MainLayout>
                    <SendNotificationPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            
            {/* Time Tracking routes */}
            <Route
              path="/time-tracking"
              element={
                <ProtectedRoute requiredPermission={['timeTracking', 'read']}>
                  <MainLayout>
                    <TimeTrackingPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-tracking/settings"
              element={
                <ProtectedRoute requiredPermission={['timeTracking', 'manageSettings']}>
                  <MainLayout>
                    <TimeTrackingSettingsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-tracking/reports"
              element={
                <ProtectedRoute requiredPermission={['timeTracking', 'viewReports']}>
                  <MainLayout>
                    <TimeTrackingReportsPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-tracking/users-activity"
              element={
                <ProtectedRoute requiredPermission={['timeTracking', 'viewAll']}>
                  <MainLayout>
                    <ActiveUsersPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* Leave Management routes */}
            <Route
              path="/leave"
              element={
                <ProtectedRoute requiredPermission={['leave', 'read']}>
                  <MainLayout>
                    <LeavePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/leave/types"
              element={
                <ProtectedRoute requiredPermission={['leave', 'manageTypes']}>
                  <MainLayout>
                    <LeaveTypesPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />

            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* 404 - Page Not Found route */}
            <Route
              path="*"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <div className="p-10 text-center">
                      <h1 className="text-4xl font-bold text-red-500 mb-4">404</h1>
                      <p className="text-xl font-semibold">Page not found</p>
                      <p className="mt-4 text-gray-600">The page you are looking for does not exist or has been moved.</p>
                    </div>
                  </MainLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
          
          {/* Toast notifications */}
          <ToastContainer position="top-right" autoClose={3000} />
        </NotificationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;