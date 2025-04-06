import React, { useState, useEffect } from 'react';
import api from '@/services/api.service';
import { useUsers } from '@/modules/users/hooks/useUsers';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  const { data: users = [] } = useUsers();
  const navigate = useNavigate();

  // Filter users based on search term
  useEffect(() => {
    if (!users.length) return setFilteredUsers([]);
    
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
      return;
    }
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    const filtered = users.filter(user => 
      user.firstName?.toLowerCase().includes(lowerCaseSearch) || 
      user.lastName?.toLowerCase().includes(lowerCaseSearch) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowerCaseSearch)
    );
    
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUserToggle = (userId) => {
    setForm((prev) => ({
      ...prev,
      userIds: prev.userIds.includes(userId)
        ? prev.userIds.filter(id => id !== userId)
        : [...prev.userIds, userId]
    }));
  };

  const handleSelectAll = () => {
    // If all filtered users are selected, deselect all, otherwise select all
    const allFilteredIds = filteredUsers.map(u => u.id);
    const allSelected = allFilteredIds.every(id => form.userIds.includes(id));
    
    if (allSelected) {
      // Remove all filtered users from selection
      setForm(prev => ({
        ...prev,
        userIds: prev.userIds.filter(id => !allFilteredIds.includes(id))
      }));
    } else {
      // Add all filtered users to selection (avoiding duplicates)
      const newSelectedIds = [...new Set([...form.userIds, ...allFilteredIds])];
      setForm(prev => ({
        ...prev,
        userIds: newSelectedIds
      }));
    }
  };

  const handleClearSelection = () => {
    setForm(prev => ({ ...prev, userIds: [] }));
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
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
          
          {/* Search bar for users */}
          <div className="mb-2">
            <input
              type="text"
              placeholder="Szukaj użytkowników..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          
          {/* Selection controls */}
          <div className="flex justify-between mb-2 text-sm">
            <div>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-indigo-600 hover:text-indigo-800 mr-3"
              >
                {filteredUsers.every(u => form.userIds.includes(u.id)) 
                  ? "Odznacz wszystkich" 
                  : "Zaznacz wszystkich"}
              </button>
              {form.userIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="text-red-600 hover:text-red-800"
                >
                  Wyczyść wybór
                </button>
              )}
            </div>
            <span className="text-gray-500">
              Wybrano: {form.userIds.length} {form.userIds.length === 1 ? 'użytkownika' : 'użytkowników'}
            </span>
          </div>
          
          {/* User list */}
          <div className="border rounded max-h-60 overflow-y-auto">
            {filteredUsers.length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                {searchTerm ? "Nie znaleziono użytkowników" : "Brak dostępnych użytkowników"}
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <li 
                    key={user.id} 
                    className={`p-3 hover:bg-gray-50 cursor-pointer ${
                      form.userIds.includes(user.id) ? 'bg-indigo-50' : ''
                    }`}
                    onClick={() => handleUserToggle(user.id)}
                  >
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={form.userIds.includes(user.id)}
                        onChange={() => {}} // Handled by parent click
                        className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="font-medium">{user.firstName} {user.lastName}</span>
                        {user.role && (
                          <span className="ml-2 text-xs text-gray-500">({user.role})</span>
                        )}
                        {user.email && (
                          <p className="text-sm text-gray-500">{user.email}</p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="sendNow"
            checked={form.sendNow}
            onChange={handleChange}
            id="sendNow"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="sendNow">Wyślij natychmiast</label>
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
