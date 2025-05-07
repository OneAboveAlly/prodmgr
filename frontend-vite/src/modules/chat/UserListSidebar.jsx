import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api.service';
import { socket } from '../../socket';
import clsx from 'clsx';

const UserListSidebar = ({ onSelectUser, selectedUser }) => {
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    
    const fetchUsers = async () => {
      try {
        const { data } = await api.get('/chat/users');
        if (isMounted.current) {
          const filtered = data.filter((u) => u.id !== selectedUser?.id);  // Ensure we don't select the current user
          console.log('📦 Fetched users:', data);
          console.log('🧹 Filtered users (excluding self):', filtered);
          setUsers(filtered);
        }
      } catch (err) {
        console.error('❌ Error fetching users:', err);
      }
    };

    // Owinięcie w setTimeout 0 zapobiega aktualizacji stanu podczas renderowania
    setTimeout(() => {
      if (isMounted.current) {
        fetchUsers();
      }
    }, 0);
    
    return () => {
      isMounted.current = false;
    };
  }, [selectedUser]);

  useEffect(() => {
    isMounted.current = true;
    
    const handleOnlineUsers = (onlineIds) => {
      console.log('🟢 Online users from socket:', onlineIds);
      if (isMounted.current) {
        setOnlineUsers(onlineIds);
      }
    };

    socket.on('chat:onlineUsers', handleOnlineUsers);
    
    // Owijamy wywołanie socket.emit w setTimeout 0, aby zapewnić, że komponent został już zamontowany
    setTimeout(() => {
      if (isMounted.current) {
        socket.emit('chat:getOnlineUsers');
        console.log('📨 Emitted request: chat:getOnlineUsers');
      }
    }, 0);

    return () => {
      isMounted.current = false;
      socket.off('chat:onlineUsers', handleOnlineUsers);
    };
  }, []);

  // Ensure users is always an array, and handle edge cases
  if (!Array.isArray(users)) {
    console.error("Expected 'users' to be an array but got", typeof users);
    return <p>Error loading users</p>;
  }

  return (
    <div className="w-1/4 border-r bg-gray-50 p-4">
      <h2 className="font-semibold text-lg mb-3">Użytkownicy</h2>
      <ul className="space-y-2">
        {users.length > 0 ? (
          users.map((u) => (
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
          ))
        ) : (
          <li>No users available</li>
        )}
      </ul>
    </div>
  );
};

export default UserListSidebar;
