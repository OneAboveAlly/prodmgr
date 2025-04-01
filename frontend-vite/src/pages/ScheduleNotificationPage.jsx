import React, { useState } from 'react';
import api from '@/services/api.service';
import { useUsers } from '@/modules/users/hooks/useUsers'; // zakładamy że masz hook do pobierania userów
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ScheduleNotificationPage = () => {
  const [form, setForm] = useState({
    content: '',
    link: '/dashboard',
    userIds: [],
    scheduledFor: new Date().toISOString().slice(0, 16),
    sendNow: true,
  });

  const { data: users = [] } = useUsers();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUserSelect = (e) => {
    const options = [...e.target.options];
    const selected = options.filter(o => o.selected).map(o => o.value);
    setForm((prev) => ({ ...prev, userIds: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
        await api.post('/notifications/schedule', {
            ...form,
            scheduledAt: new Date(form.scheduledFor).toISOString(),
            sendNow: form.sendNow,
          });
          
      toast.success('Powiadomienie zaplanowane!');
      navigate('/notifications');
    } catch (err) {
      console.error('Błąd planowania:', err);
      toast.error('Nie udało się zaplanować powiadomienia');
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-bold mb-4">✉️ Zaplanuj Powiadomienie</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Treść</label>
          <input
            type="text"
            name="content"
            value={form.content}
            onChange={handleChange}
            required
            className="w-full border rounded px-3 py-2"
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

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="sendNow"
            checked={form.sendNow}
            onChange={handleChange}
          />
          <label>Wyślij natychmiast</label>
        </div>

        {!form.sendNow && (
          <div>
            <label className="block text-sm font-medium mb-1">Data i godzina</label>
            <input
              type="datetime-local"
              name="scheduledFor"
              value={form.scheduledFor}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required={!form.sendNow}
            />
          </div>
        )}

        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
        >
          Zapisz
        </button>
      </form>
    </div>
  );
};

export default ScheduleNotificationPage;
