import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import ProductionsPage from './pages/ProductionsPage';
import WarehousePage from './pages/WarehousePage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersPage /></ProtectedRoute>} />
            <Route path="/productions" element={<ProtectedRoute><ProductionsPage /></ProtectedRoute>} />
            <Route path="/warehouse" element={<ProtectedRoute><WarehousePage /></ProtectedRoute>} />
            
            {/* Add more routes as needed */}
          </Routes>
        </Router>
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;