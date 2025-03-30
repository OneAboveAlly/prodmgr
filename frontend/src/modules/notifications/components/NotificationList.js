import React from 'react';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';
import { Link } from 'react-router-dom';

const NotificationList = () => {
  const { data: notifications, isLoading } = useNotifications();
  const markAsRead = useMarkAsRead();

  if (isLoading) return <div>Ładowanie powiadomień...</div>;
  if (!notifications || notifications.length === 0) {
    return <div className="p-4 text-gray-500">Brak powiadomień.</div>;
  }
  
  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Powiadomienia</h2>
      <ul className="space-y-2">
        {notifications.map(notification => (
          <li
            key={notification.id}
            className={`p-3 rounded-lg border cursor-pointer ${
              notification.isRead ? 'opacity-50' : 'bg-white shadow'
            }`}
            onClick={() => markAsRead.mutate(notification.id)}
          >
            <Link to={notification.link}>
              {notification.content}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationList;