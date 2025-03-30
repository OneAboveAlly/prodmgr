import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, useMarkAsRead } from '@/modules/notifications/hooks/useNotifications';
import { useLiveNotifications } from '@/contexts/NotificationContext';
import { Link } from 'react-router-dom';
import api from '@/services/api.service';
import { useQueryClient } from '@tanstack/react-query';

const NotificationBadge = () => {
  const { data, isLoading, refetch } = useNotifications();
  const {
    notifications: liveNotifications,
    markNotificationAsRead,
    unreadCount,
    setUnreadCount,
    setNotifications,
  } = useLiveNotifications();

  const markAsRead = useMarkAsRead();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const apiNotifications = data || [];
  const allNotifications = [
    ...liveNotifications,
    ...apiNotifications.filter((n) => !liveNotifications.find((l) => l.id === n.id)),
  ].filter((n) => !n.archived); // <== 🔥 najważniejsze!

  const toggleDropdown = () => setOpen((prev) => !prev);

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    const userId = localStorage.getItem('userId');
    try {
      await api.patch(`/notifications/mark-all-read/${userId}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      refetch();
    } catch (err) {
      console.error('Błąd oznaczania jako przeczytane:', err);
    }
  };

  const handleClearAll = async () => {
    const userId = localStorage.getItem('userId');
    try {
      await api.patch(`/notifications/archive-all/${userId}`);
      setNotifications((prev) => prev.map((n) => ({ ...n, archived: true })));
      setUnreadCount(0);
      refetch();
      queryClient.invalidateQueries(['notifications']);
    } catch (err) {
      console.error('Błąd archiwizacji:', err);
    }
  };

  useEffect(() => {
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={toggleDropdown} className="relative">
        <Bell className="w-6 h-6 text-gray-700 hover:text-indigo-600 transition" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg z-50 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-700">Powiadomienia</h3>
            <div>
              {unreadCount > 0 && (
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
            {allNotifications.length === 0 && (
              <p className="text-sm text-gray-500">Brak powiadomień</p>
            )}
            {allNotifications.map((notification) => (
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
                <Link to={notification.link}>{notification.content}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default NotificationBadge;
