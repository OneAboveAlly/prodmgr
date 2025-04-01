import React, { useState } from 'react';
import UserListSidebar from '@/modules/chat/components/UserListSidebar';
import ChatBox from '@/modules/chat/components/ChatBox';

const MessagesPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
  };

  return (
    <div className="flex h-screen">
      {/* User List Sidebar */}
      <UserListSidebar onSelectUser={handleSelectUser} selectedUser={selectedUser} />
      
      {/* Chat Box */}
      <div className="flex-1 p-4">
        {selectedUser ? (
          <ChatBox selectedUser={selectedUser} />
        ) : (
          <p className="text-center mt-20 text-gray-500 text-lg">Wybierz użytkownika, aby rozpocząć rozmowę.</p>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
