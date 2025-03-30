import React, { useState } from 'react';
import UserListSidebar from '../components/UserListSidebar';
import ChatBox from '../components/ChatBox'; // dodaj to

const MessagesPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="flex h-[calc(100vh-80px)]">
      <UserListSidebar onSelectUser={setSelectedUser} />
      <div className="flex-1 p-4">
        {selectedUser ? (
          <ChatBox selectedUser={selectedUser} />
        ) : (
          <p className="text-gray-500">Wybierz użytkownika, aby rozpocząć rozmowę</p>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
