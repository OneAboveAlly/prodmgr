import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import PermissionDebugger from '../common/PermissionDebugger';
import useSocketNotifications from '../../modules/notifications/hooks/useSocketNotifications'; // Fixed import path
import NotificationBadge from '../NotificationBadge'; // Import the NotificationBadge component
import { MessageCircle, Clock, User, LogOut, ChevronDown } from 'lucide-react'; // Import MessageCircle, Clock, User, LogOut, ChevronDown icons from lucide-react
import BarcodeWidget from '../../modules/barcode'; // Import the BarcodeWidget component


const MainLayout = ({ children }) => {
  const { user, logout, isReady, hasPermission } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Aktualizacja zegara co sekundę
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => {
      clearInterval(timer);
    };
  }, []);

  useSocketNotifications(); // 🔥 aktywacja socketów

  // Formatowanie czasu
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Formatowanie daty
  const formatDate = (date) => {
    return date.toLocaleDateString([], { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  // Pobierz nazwę głównej roli użytkownika
  const getUserRoleName = () => {
    if (!user || !user.roles || user.roles.length === 0) return "Użytkownik";
    
    // Znajdź rolę z najwyższym poziomem dostępu (na podstawie właściwości name)
    // Priorytety: Admin > Manager > User > pozostałe role
    if (user.roles.some(role => role.name === 'Admin' || role.name === 'Administrator')) {
      return 'Administrator';
    }
    
    if (user.roles.some(role => role.name === 'Manager')) {
      return 'Manager';
    }
    
    if (user.roles.some(role => role.name === 'User')) {
      return 'Użytkownik';
    }
    
    // Jeśli nie ma żadnej z powyższych ról, zwróć pierwszą z listy
    return user.roles[0].name;
  };

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
      name: 'Produkcja',
      path: '/production',
      icon: 'fas fa-industry',
      permission: 'production.read'
    },
    {
      name: 'Magazyn',
      path: '/inventory',
      icon: 'fas fa-boxes',
      permission: 'inventory.read'
    },
    {
      name: 'Użytkownicy',
      path: '/users',
      icon: 'fas fa-users',
      permission: 'users.read'
    },
    {
      name: 'Role',
      path: '/roles',
      icon: 'fas fa-user-tag',
      permission: 'roles.read'
    },
    {
      name: 'Powiadomienia',
      path: '/notifications',
      icon: 'fas fa-bell',
      permission: 'notifications.read'
    },
    {
      name: 'Wyślij powiadomienie',
      path: '/notifications/send',
      icon: 'fas fa-paper-plane',
      permission: 'notifications.send'
    },
    {
      name: 'Logi audytu',
      path: '/audit-logs',
      icon: 'fas fa-history',
      permission: 'auditLogs.read'
    },
    {
      name: 'Czas pracy',
      path: '/time-tracking',
      icon: 'fas fa-clock',
      permission: 'timeTracking.read'
    },
    {
      name: 'Urlopy',
      path: '/leave',
      icon: 'fas fa-calendar-alt',
      permission: 'leave.read'
    }
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
            {navLinks.map((link) => {
              if (link.isSection) {
                return sidebarOpen ? (
                  <li key={link.name} className="px-4 py-2 text-xs uppercase text-indigo-200 tracking-wider">
                    {link.name}
                  </li>
                ) : null;
              }
              
              return (
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
              );
            })}
          </ul>
        </nav>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                {/* Zegar i data */}
                <div className="flex items-center text-gray-700 mr-6">
                  <Clock className="w-5 h-5 text-indigo-600 mr-2" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{formatTime(currentTime)}</span>
                    <span className="text-xs text-gray-500">{formatDate(currentTime)}</span>
                  </div>
                </div>
                
                {/* Tutaj można dodać inne elementy po lewej stronie */}
              </div>
              
              {/* User menu i ikony po prawej */}
              <div className="flex items-center space-x-5">
                {/* Barcode Generator */}
                <div className="rounded-full p-2 hover:bg-indigo-50 transition-colors" title="Generator kodów">
                  <BarcodeWidget />
                </div>
                
                {/* Chat icon - dymek wiadomości */}
                <Link 
                  to="/messages" 
                  className="rounded-full p-2 hover:bg-indigo-50 transition-colors"
                  title="Wiadomości"
                >
                  <MessageCircle className="w-5 h-5 text-indigo-600" />
                </Link>
                
                {/* Notifications - dzwonek */}
                <div className="rounded-full p-2 hover:bg-indigo-50 transition-colors" title="Powiadomienia">
                  <NotificationBadge />
                </div>
                
                {/* Divider */}
                <div className="h-8 border-r border-gray-300"></div>
                
                {/* User profile dropdown */}
                <div className="relative">
                  <button 
                    className="flex items-center text-gray-700 hover:text-indigo-600 focus:outline-none transition-colors"
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                  >
                    <div className="bg-indigo-100 w-8 h-8 rounded-full flex items-center justify-center mr-2">
                      <span className="text-indigo-700 text-sm font-medium">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">{user?.firstName} {user?.lastName}</span>
                      <span className="text-xs text-gray-500">{getUserRoleName()}</span>
                    </div>
                    <ChevronDown className="ml-2 w-4 h-4" />
                  </button>
                  
                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                      <Link 
                        to="/profile" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <User className="mr-2 h-4 w-4" />
                        Mój profil
                      </Link>
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Wyloguj
                      </button>
                    </div>
                  )}
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