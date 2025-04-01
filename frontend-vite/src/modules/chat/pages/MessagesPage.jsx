// frontend/src/modules/chat/pages/MessagesPage.jsx
import React, { useState } from 'react';
import ChatBox from '../components/ChatBox';
import UserListSidebar from '../components/UserListSidebar';

const MessagesPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <UserListSidebar selectedUser={selectedUser} onSelectUser={setSelectedUser} />
      <div className="flex-1 p-4">
        {selectedUser ? (
          <ChatBox selectedUser={selectedUser} />
        ) : (
          <div className="text-center mt-20 text-gray-500 text-lg">Tu będą wiadomości</div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
