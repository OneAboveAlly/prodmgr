// frontend/src/modules/chat/pages/MessagesPage.jsx
import React, { useState, useEffect } from 'react';
import ChatBox from '../components/ChatBox';
import UserListSidebar from '../components/UserListSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { socket, refreshSocketConnection } from '@/socket';

const MessagesPage = () => {
  const [selectedUser, setSelectedUser] = useState(null);
  const { user } = useAuth();

  // Efekt dla resetowania połączenia z socketem przy wejściu na stronę
  useEffect(() => {
    if (user) {
      // Odświeżamy połączenie by upewnić się, że statusy są aktualne
      refreshSocketConnection();
      
      // Explicitnie pobieramy status online innych użytkowników
      socket.emit('chat:getOnlineUsers');
    }
    
    // Dodatkowo regularnie odświeżamy statusy online
    const intervalId = setInterval(() => {
      if (user) {
        socket.emit('chat:getOnlineUsers');
      }
    }, 60000); // Co minutę
    
    return () => {
      clearInterval(intervalId);
    };
  }, [user]);

  return (
    <div className="flex h-[calc(100vh-64px)]">
      <UserListSidebar 
        onSelectUser={setSelectedUser} 
        selectedUser={selectedUser}
      />
      <div className="flex-1 p-4">
        {selectedUser ? (
          <ChatBox selectedUser={selectedUser} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-gray-500 text-lg mb-2">Wybierz użytkownika, aby rozpocząć rozmowę</div>
            <div className="text-gray-400 text-sm">Wiadomości są sortowane według czasu - najnowsze na górze</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
