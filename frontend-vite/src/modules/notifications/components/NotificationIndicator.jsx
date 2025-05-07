import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/contexts/SocketContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/services/api.service';
import { useNotifications } from '../hooks/useNotifications';
import { BellIcon, CheckIcon } from '@heroicons/react/24/outline';
import { BellAlertIcon } from '@heroicons/react/24/solid';
import { AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const NotificationIndicator = () => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [newNotification, setNewNotification] = useState(false);
  const { user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  // Pobierz powiadomienia
  const { data: notifications, isLoading } = useNotifications();
  
  // Liczba nieprzeczytanych
  const [unreadCount, setInternalUnreadCount] = useState(0);
  
  // Aktualizuj licznik nieprzeczytanych po załadowaniu danych z API
  useEffect(() => {
    if (notifications) {
      const count = notifications.filter(n => !n.isRead && !n.archived).length;
      setInternalUnreadCount(count);
    }
  }, [notifications]);

  // Słuchaj nowych powiadomień przez socket
  useEffect(() => {
    if (!socket || !user) return;

    // Funkcja obsługująca nowe powiadomienia
    const handleNewNotification = (notification) => {
      console.log('📲 Nowe powiadomienie otrzymane:', notification);
      
      // Aktualizujemy cache React Query
      queryClient.invalidateQueries(['notifications']);
      
      // Zwiększ licznik nieprzeczytanych
      setInternalUnreadCount(prev => prev + 1);
      
      // Pokaż animację
      setNewNotification(true);
      setTimeout(() => setNewNotification(false), 3000);
      
      // Odtwórz dźwięk powiadomienia (opcjonalnie)
      try {
        const audio = new Audio('/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play();
      } catch (e) {
        // Ignoruj błędy odtwarzania dźwięku
      }
      
      // Specjalne formatowanie dla powiadomień produkcyjnych
      if (notification.type === 'PRODUCTION') {
        const emoji = {
          'GUIDE_COMPLETED': '🏆',
          'STEP_COMPLETED': '✅',
          'GUIDE_ASSIGNED': '📋',
          'GUIDE_ARCHIVED': '🗄️',
          'GUIDE_CREATED': '🆕',
        }[notification.metadata?.productionType] || '🔔';
        
        toast.info(`${emoji} ${notification.content}`, {
          autoClose: 5000,
          hideProgressBar: false,
        });
      } else {
        toast.info(notification.content);
      }
    };

    // Nasłuchuj na zdarzenia powiadomień
    socket.on(`notification:${user.id}`, handleNewNotification);

    return () => {
      // Czyść nasłuchiwanie przy odmontowaniu
      if (socket) {
        socket.off(`notification:${user.id}`, handleNewNotification);
      }
    };
  }, [socket, user, queryClient]);

  // Obsługa kliknięcia poza dropdown
  useEffect(() => {
    const handleClickOutside = () => {
      if (showNotifications) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showNotifications]);

  // Funkcja do oznaczania wszystkich jako przeczytane
  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await api.patch(`/notifications/mark-all-read/${user.id}`);
      setInternalUnreadCount(0);
      queryClient.invalidateQueries(['notifications']);
      toast.success('Wszystkie powiadomienia oznaczono jako przeczytane');
    } catch (error) {
      console.error('Błąd oznaczania powiadomień:', error);
    }
  };

  // Obsługa kliknięcia w ikonę dzwoneczka
  const handleBellClick = (evt) => {
    evt.stopPropagation(); // Zapobiega zamknięciu przez globalny click handler
    setShowNotifications(prev => !prev);
  };

  const getNotificationColor = (notificationType) => {
    const typeColors = {
      SYSTEM: 'bg-blue-100 text-blue-800',
      PRODUCTION: 'bg-green-100 text-green-800',
      LEAVE: 'bg-yellow-100 text-yellow-800',
      INVENTORY: 'bg-purple-100 text-purple-800',
      default: 'bg-gray-100 text-gray-800'
    };
    
    return typeColors[notificationType] || typeColors.default;
  };

  const getNotificationIcon = () => {
    // Można później rozwinąć o logikę dla różnych ikon
    return "🔔";
  };

  return (
    <div className="relative">
      {/* Ikona dzwoneczka z licznikiem */}
      <button
        onClick={handleBellClick}
        className={`relative p-2 rounded-full focus:outline-none transition-colors ${
          newNotification 
            ? 'animate-pulse text-yellow-500 bg-yellow-100' 
            : unreadCount > 0 
              ? 'text-indigo-600 hover:bg-indigo-100' 
              : 'text-gray-500 hover:bg-gray-100'
        }`}
      >
        {unreadCount > 0 ? (
          <BellAlertIcon className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown z powiadomieniami */}
      <AnimatePresence>
        {showNotifications && notifications && (
          <div
            className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg overflow-hidden z-50"
          >
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="text-sm font-semibold text-gray-700">Powiadomienia</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                >
                  <CheckIcon className="h-3 w-3 mr-1" />
                  Oznacz wszystkie jako przeczytane
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">Ładowanie...</div>
              ) : notifications?.length === 0 ? (
                <div className="p-4 text-center text-gray-500">Brak powiadomień</div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {notifications
                    ?.filter(n => !n.archived)
                    .slice(0, 5)
                    .map((notification) => (
                      <li 
                        key={notification.id}
                        className={`p-3 hover:bg-gray-50 transition-colors ${!notification.isRead ? 'bg-indigo-50' : ''}`}
                      >
                        <Link 
                          to={notification.link || "#"}
                          className="block"
                          onClick={() => {
                            // Oznacz jako przeczytane przy kliknięciu
                            if (!notification.isRead) {
                              api.patch(`/notifications/${notification.id}/read`);
                              queryClient.invalidateQueries(['notifications']);
                              setInternalUnreadCount(prev => Math.max(0, prev - 1));
                            }
                            setShowNotifications(false);
                          }}
                        >
                          <div className="flex items-start">
                            <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full ${getNotificationColor(notification.type)} mr-2 flex-shrink-0`}>
                              {getNotificationIcon()}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${!notification.isRead ? 'font-medium' : 'text-gray-600'}`}>
                                {notification.content}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <div className="p-2 border-t text-center">
              <Link
                to="/notifications"
                className="block w-full text-sm text-indigo-600 hover:text-indigo-800 py-1"
                onClick={() => setShowNotifications(false)}
              >
                Zobacz wszystkie powiadomienia
              </Link>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationIndicator; 