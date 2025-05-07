import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, useMarkAsRead } from '@/modules/notifications/hooks/useNotifications';
import { useLiveNotifications } from '@/contexts/NotificationContext';
import { Link } from 'react-router-dom';
import api from '@/services/api.service';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const NotificationBadge = () => {
  const { data, isLoading, refetch } = useNotifications();
  const {
    notifications: liveNotifications,
    markNotificationAsRead,
    unreadCount: liveUnreadCount,
    setUnreadCount,
    setNotifications,
  } = useLiveNotifications();
  
  const { user } = useAuth();
  const markAsRead = useMarkAsRead();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Oblicz rzeczywistą liczbę nieprzeczytanych powiadomień z obu źródeł (API i socket)
  const apiNotifications = data || [];
  const apiUnreadCount = apiNotifications.filter(n => !n.isRead && !n.archived).length;
  
  // Kombinowana liczba nieprzeczytanych
  const combinedUnreadCount = Math.max(apiUnreadCount, liveUnreadCount);
  
  // Wszystkie powiadomienia do wyświetlenia
  const allNotifications = [
    ...liveNotifications,
    ...apiNotifications.filter((n) => !liveNotifications.find((l) => l.id === n.id)),
  ].filter((n) => !n.archived);
  
  // Synchronizuj licznik nieprzeczytanych ze stanem z API przy pierwszym ładowaniu
  useEffect(() => {
    if (!isLoading && data) {
      const newUnreadCount = data.filter(n => !n.isRead && !n.archived).length;
      setUnreadCount(newUnreadCount);
    }
  }, [data, isLoading, setUnreadCount]);

  const toggleDropdown = () => setOpen((prev) => !prev);

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    
    try {
      await api.patch(`/notifications/mark-all-read/${user.id}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      refetch();
      
      // Odśwież cache React Query
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'history']);
    } catch (err) {
      console.error('Błąd oznaczania jako przeczytane:', err);
    }
  };

  const handleClearAll = async () => {
    if (!user?.id) return;
    
    try {
      await api.patch(`/notifications/archive-all/${user.id}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, archived: true })));
      setUnreadCount(0);
      refetch();
      
      // Odśwież cache React Query
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries(['notifications', 'history']);
    } catch (err) {
      console.error('Błąd archiwizacji:', err);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sortowanie powiadomień - najnowsze na górze
  const sortedNotifications = [...allNotifications].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  // Określ kolor ikony w zależności od statusu powiadomień
  const getBellColor = () => {
    if (combinedUnreadCount > 0) {
      return "text-indigo-600 hover:text-indigo-700";
    }
    return "text-gray-700 hover:text-indigo-600";
  };

  if (isLoading) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={toggleDropdown} className="relative">
        <Bell className={`w-6 h-6 ${getBellColor()} transition-colors`} />
        {combinedUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5 min-w-5 h-5 flex items-center justify-center">
            {combinedUnreadCount > 99 ? '99+' : combinedUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Powiadomienia</h3>
            <div>
              {combinedUnreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Oznacz wszystkie
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-xs text-red-500 hover:underline ml-2"
              >
                Wyczyść
              </button>
            </div>
          </div>
          <ul className="max-h-64 overflow-y-auto space-y-2">
            {sortedNotifications.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Brak powiadomień</p>
            )}
            {sortedNotifications.map((notification) => (
              <li
                key={notification.id}
                className={`text-sm p-3 rounded-lg cursor-pointer hover:bg-gray-100 transition ${
                  notification.isRead ? 'text-gray-400' : 'text-gray-800 font-medium'
                }`}
                onClick={() => {
                  markAsRead.mutate(notification.id);
                  markNotificationAsRead(notification.id);
                  setOpen(false);
                }}
              >
                <Link to={notification.link || '#'} className="block">
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-indigo-100 text-indigo-500 mr-2 flex-shrink-0">
                      {notification.type === 'PRODUCTION' ? '📋' : '🔔'}
                    </span>
                    <div>
                      <p>{notification.content}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
