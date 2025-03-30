import React, { useEffect, useState } from 'react';
import api from '@/services/api.service';
import { socket } from '@/socket';
import clsx from 'clsx';

const UserListSidebar = ({ onSelectUser, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/users');
        const filtered = data.filter((u) => u.id !== selectedUser?.id);
        console.log('📦 Fetched users:', data);
        console.log('🧹 Filtered users (excluding self):', filtered);
        setUsers(filtered);
      } catch (err) {
        console.error('❌ Error fetching users:', err);
      }
    };

    fetchUsers();
  }, [selectedUser]);

  useEffect(() => {
    const handleOnlineUsers = (onlineIds) => {
      console.log('🟢 Online users from socket:', onlineIds);
      setOnlineUsers(onlineIds);
    };

    socket.on('chat:onlineUsers', handleOnlineUsers);
    socket.emit('chat:getOnlineUsers');
    console.log('📨 Emitted request: chat:getOnlineUsers');

    return () => {
      socket.off('chat:onlineUsers', handleOnlineUsers);
    };
  }, []);

  console.log('🧩 Rendering UserListSidebar... Users:', users, 'Online:', onlineUsers);

  return (
    <div className="w-1/4 border-r bg-gray-50 p-4">
      <h2 className="font-semibold text-lg mb-3">Użytkownicy</h2>
      <ul className="space-y-2">
        {users.map((u) => (
          <li
            key={u.id}
            onClick={() => onSelectUser(u)}
            className={clsx(
              'cursor-pointer p-2 rounded-lg hover:bg-gray-100 flex items-center justify-between',
              selectedUser?.id === u.id && 'bg-indigo-100'
            )}
          >
            <span>{u.firstName} {u.lastName}</span>
            <span className={`w-2 h-2 rounded-full ${onlineUsers.includes(u.id) ? 'bg-green-500' : 'bg-gray-400'}`} />
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UserListSidebar;
