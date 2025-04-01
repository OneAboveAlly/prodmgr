import React from 'react';
import { useNotificationHistory } from '@/modules/notifications/hooks/useNotifications';
import { Link } from 'react-router-dom';
import api from '@/services/api.service';
import { toast } from 'react-toastify';

const NotificationListPage = () => {
  const { data, isLoading, refetch } = useNotificationHistory();

  const handleArchive = async (id) => {
    try {
      await api.patch(`/notifications/${id}/archive`);
      toast.success('Zarchiwizowano');
      refetch();
    } catch (err) {
      console.error('❌ Błąd archiwizacji:', err);
      toast.error('Błąd archiwizacji');
    }
  };

  if (isLoading) return <p>Wczytywanie...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">📥 Skrzynka powiadomień (Historia)</h1>
        <div className="flex items-center gap-4">
          <Link
            to="/notifications"
            className="text-sm text-indigo-600 hover:underline"
          >
            ← Powrót do aktywnych
          </Link>
          
        </div>
      </div>

      {data?.length === 0 && <p className="text-gray-500">Brak powiadomień</p>}

      <ul className="space-y-4">
        {data?.map((n) => (
          <li
            key={n.id}
            className={`p-4 border rounded-lg flex justify-between items-start gap-4 ${
              n.archived ? 'bg-gray-100 text-gray-500' : 'bg-white shadow'
            }`}
          >
            <div className="flex-1 space-y-1">
              <Link
                to={n.link}
                className="text-sm font-medium text-indigo-600 hover:underline"
              >
                {n.content}
              </Link>
              <p className="text-xs text-gray-500">
                {new Date(n.createdAt).toLocaleString()}
              </p>
            </div>
            {!n.archived && (
              <button
                onClick={() => handleArchive(n.id)}
                className="text-xs text-red-500 hover:underline"
              >
                Archiwizuj
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationListPage;