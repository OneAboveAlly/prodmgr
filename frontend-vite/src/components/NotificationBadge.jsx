import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications, useMarkAsRead } from '@/modules/notifications/hooks/useNotifications';
import { useLiveNotifications } from '@/contexts/NotificationContext';
import { Link } from 'react-router-dom';

const NotificationBadge = () => {
  const { data, isLoading } = useNotifications();
  const {
    notifications: liveNotifications,
    markNotificationAsRead, // 🔥 dodaj to!
  } = useLiveNotifications();

  const markAsRead = useMarkAsRead();
  const dropdownRef = useRef(null);
  const [open, setOpen] = useState(false);

  const apiNotifications = data || [];
  const allNotifications = [
    ...liveNotifications,
    ...apiNotifications.filter((n) => !liveNotifications.find((l) => l.id === n.id)),
  ];
  const unread = allNotifications.filter((n) => !n.isRead);

  const toggleDropdown = () => setOpen((prev) => !prev);

  const handleClickOutside = (e) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
      setOpen(false);
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
        {unread.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1.5">
            {unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg z-50 p-4">
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Powiadomienia</h3>
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
                  if (!notification.id) {
                    console.warn('🚨 Brakuje ID powiadomienia:', notification);
                  } else {
                    markAsRead.mutate(notification.id); // backend
                    markNotificationAsRead(notification.id); // frontend 🧠
                    setOpen(false);
                  }
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
