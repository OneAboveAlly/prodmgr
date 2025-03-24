import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
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
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
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
                <ProtectedRoute>
                  <MainLayout>
                    <UsersPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/users/new"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CreateUserPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/users/edit/:id"
              element={
                <ProtectedRoute>
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
                <ProtectedRoute>
                  <MainLayout>
                    <RolesPage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/roles/new"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CreateRolePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/roles/edit/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <EditRolePage />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            
            {/* Redirect root to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            
            {/* Redirect any unmatched routes to dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        
        {/* Toast notifications */}
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;