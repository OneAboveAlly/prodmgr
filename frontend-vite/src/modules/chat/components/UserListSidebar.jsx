import React, { useEffect, useState } from 'react';
import { socket } from '@/socket';
import api from '@/services/api.service';

const UserListSidebar = ({ onSelectUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await api.get('/users'); // 👈 za chwilę doprecyzujemy endpoint
        setUsers(res.data);
      } catch (err) {
        console.error('Błąd ładowania użytkowników:', err);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    socket.on('users:online', (ids) => {
      setOnlineUsers(ids);
    });

    return () => {
      socket.off('users:online');
    };
  }, []);

  return (
    <div className="w-64 bg-white border-r h-full overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-4">Użytkownicy</h2>
      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            onClick={() => onSelectUser(user)}
            className="cursor-pointer p-2 rounded hover:bg-gray-100 flex items-center justify-between"
          >
            <span>{user.firstName} {user.lastName}</span>
            <span className={`w-3 h-3 rounded-full ${onlineUsers.includes(user.id) ? 'bg-green-500' : 'bg-gray-400'}`} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserListSidebar;
