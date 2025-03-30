import React from 'react';
import { useNotifications, useMarkAsRead } from '../hooks/useNotifications';
import { Link } from 'react-router-dom';

const NotificationList = () => {
  const { data, isLoading } = useNotifications();
  const notifications = data || [];
  const markAsRead = useMarkAsRead();

  if (isLoading) return <div>Ładowanie powiadomień...</div>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">📬 Aktywne powiadomienia</h1>
        <Link
          to="/notifications/history"
          className="text-sm text-indigo-600 hover:underline"
        >
          Przejdź do archiwum →
        </Link>
      </div>

      {notifications.length === 0 && (
        <p className="text-gray-500">Brak aktywnych powiadomień</p>
      )}

      <ul className="space-y-4">
        {notifications.map((n) => (
          <li
            key={n.id}
            className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-100 transition ${
              n.isRead ? 'opacity-50' : 'bg-white shadow'
            }`}
            onClick={() => markAsRead.mutate(n.id)}
          >
            <Link to={n.link} className="text-sm text-indigo-700 hover:underline">
              {n.content}
            </Link>
            <p className="text-xs text-gray-500">
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationList;
