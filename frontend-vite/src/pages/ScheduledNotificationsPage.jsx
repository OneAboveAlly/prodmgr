// frontend/src/pages/ScheduledNotificationsPage.js
import React from 'react';
import { useScheduledNotifications } from '@/modules/notifications/hooks/useNotifications';
import api from '@/services/api.service';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

const ScheduledNotificationsPage = () => {
  const { data = [], isLoading } = useScheduledNotifications();
  const queryClient = useQueryClient();

  const handleDelete = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      toast.success('Powiadomienie usunięte');
      queryClient.invalidateQueries(['notifications', 'scheduled']);
    } catch (err) {
      console.error('Błąd usuwania:', err);
      toast.error('Nie udało się usunąć powiadomienia');
    }
  };

  if (isLoading) return <p>Wczytywanie...</p>;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">⏳ Zaplanowane powiadomienia</h1>
        <Link to="/notifications/schedule" className="text-sm text-indigo-600 hover:underline">
          + Zaplanuj nowe
        </Link>
      </div>

      {data.length === 0 && <p className="text-gray-500">Brak zaplanowanych powiadomień</p>}

      <ul className="space-y-4">
        {data.map((n) => (
          <li key={n.id} className="p-4 border rounded bg-yellow-50">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-sm font-medium text-indigo-700 block">{n.content}</span>
                <span className="text-xs text-gray-500 block">
                  Zaplanowano na: {new Date(n.scheduledAt).toLocaleString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Link
                  to={`/notifications/schedule/edit/${n.id}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  Edytuj
                </Link>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Usuń
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ScheduledNotificationsPage;