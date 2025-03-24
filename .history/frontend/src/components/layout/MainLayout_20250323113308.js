import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function MainLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 text-white">
        <div className="p-4 font-bold text-xl">Production Manager</div>
        
        <nav className="mt-6">
          <Link to="/" className="block py-2.5 px-4 hover:bg-gray-700">Dashboard</Link>
          <Link to="/users" className="block py-2.5 px-4 hover:bg-gray-700">Użytkownicy</Link>
          <Link to="/productions" className="block py-2.5 px-4 hover:bg-gray-700">Produkcja</Link>
          <Link to="/warehouse" className="block py-2.5 px-4 hover:bg-gray-700">Magazyn</Link>
          {/* Dodaj więcej linków według potrzeb */}
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-xl font-semibold">Production Manager</h2>
            
            <div className="flex items-center">
              <span className="mr-4">Witaj, {user?.firstName} {user?.lastName}</span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Wyloguj
              </button>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default MainLayout;