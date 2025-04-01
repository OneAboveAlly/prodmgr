import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '@/services/api.service';
import { useUsers } from '@/modules/users/hooks/useUsers';
import { toast } from 'react-toastify';

const ScheduleNotificationEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const { data: users = [] } = useUsers();

  // Pobierz istniejące dane
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get(`/notifications/${id}`);
        const notif = res.data;

        setForm({
          content: notif.content,
          link: notif.link,
          userIds: [notif.userId],
          scheduledFor: new Date(notif.scheduledAt).toISOString().slice(0, 16),
          sendNow: false
        });
    } catch (err) {
        console.error('Błąd aktualizacji powiadomienia:', err);
        toast.error(err?.response?.data?.message || 'Nie udało się zaktualizować');
      }
    };

    fetchData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleUserSelect = (e) => {
    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
    setForm((prev) => ({ ...prev, userIds: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/notifications/${id}`, {
        ...form,
        scheduledAt: new Date(form.scheduledFor).toISOString(),
        sendNow: false,
      });
      toast.success('Zaktualizowano powiadomienie!');
      navigate('/notifications/scheduled');
    } catch (err) {
        console.error('Błąd aktualizacji powiadomienia:', err);
        toast.error(err?.response?.data?.message || 'Nie udało się zaktualizować');
      }
  };

  if (!form) return <p>Ładowanie...</p>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">✏️ Edytuj Zaplanowane Powiadomienie</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Treść</label>
          <input
            type="text"
            name="content"
            value={form.content}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Link</label>
          <input
            type="text"
            name="link"
            value={form.link}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Użytkownicy</label>
          <select
            multiple
            value={form.userIds}
            onChange={handleUserSelect}
            className="w-full border rounded px-3 py-2 h-32"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.firstName} {u.lastName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Data i godzina</label>
          <input
            type="datetime-local"
            name="scheduledFor"
            value={form.scheduledFor}
            onChange={handleChange}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
        >
          Zapisz zmiany
        </button>
      </form>
    </div>
  );
};

export default ScheduleNotificationEditPage;
