import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Search, UserCheck, UserX, Circle } from 'lucide-react';

const UserListSidebar = ({ onSelectUser, selectedUser }) => {
  const { user } = useAuth();
  const { users, onlineUsers, loading, messages, lastMessagesLoaded, hideMyOnlineStatus, toggleMyVisibility } = useChat();
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [forceUpdate, setForceUpdate] = useState(0);

  // Efekt dla odbierania eventów nowych wiadomości - wymusza rerender listy
  useEffect(() => {
    const handleMessageReceived = () => {
      // Wywołaj rerender tylko gdy przychodzi nowa wiadomość
      setForceUpdate(prev => prev + 1);
    };

    window.addEventListener('chat:messageReceived', handleMessageReceived);
    
    return () => {
      window.removeEventListener('chat:messageReceived', handleMessageReceived);
    };
  }, []);

  const toggleOnlineStatusVisibility = () => {
    setHideOnlineStatus(!hideOnlineStatus);
  };

  // Funkcja pomocnicza do pobierania ostatnich wiadomości z każdym użytkownikiem
  const getLastMessageWithUser = useCallback((userId) => {
    const userMessages = messages[userId] || [];
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  }, [messages]);

  // Funkcja sprawdzająca czy są nieprzeczytane wiadomości od użytkownika
  const hasUnreadMessages = useCallback((userId) => {
    const userMessages = messages[userId] || [];
    return userMessages.some(msg => 
      msg.senderId === userId && 
      !msg.isRead && 
      !msg.isDeleted
    );
  }, [messages]);

  // Funkcja sprawdzająca ilość nieprzeczytanych wiadomości od użytkownika
  const getUnreadCount = useCallback((userId) => {
    const userMessages = messages[userId] || [];
    return userMessages.filter(msg => 
      msg.senderId === userId && 
      !msg.isRead && 
      !msg.isDeleted
    ).length;
  }, [messages]);

  // Funkcja formatująca czas wiadomości
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };

  // Sortujemy użytkowników według czasu ostatniej wiadomości - z useCallback
  const sortedUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    // Tworzymy kopię tablicy użytkowników do sortowania
    const sortableUsers = [...users];
    
    // Sortujemy użytkowników według czasu ostatniej wiadomości
    return sortableUsers.sort((a, b) => {
      // Najpierw sprawdzamy nieprzeczytane wiadomości - te będą na górze
      const hasUnreadA = hasUnreadMessages(a.id);
      const hasUnreadB = hasUnreadMessages(b.id);
      
      // Jeśli jedno ma nieprzeczytane wiadomości a drugie nie, to priorytetyzujemy nieprzeczytane
      if (hasUnreadA && !hasUnreadB) return -1;
      if (!hasUnreadA && hasUnreadB) return 1;
      
      // Jeśli oba mają nieprzeczytane wiadomości lub oba nie mają, sortujemy wg czasu
      const lastMessageA = getLastMessageWithUser(a.id);
      const lastMessageB = getLastMessageWithUser(b.id);
      
      // Używamy 0 jako domyślnego czasu, jeśli nie ma wiadomości
      const timeA = lastMessageA ? new Date(lastMessageA.createdAt).getTime() : 0;
      const timeB = lastMessageB ? new Date(lastMessageB.createdAt).getTime() : 0;
      
      // Sortuj malejąco (najnowsze na górze)
      return timeB - timeA;
    });
  }, [users, messages, getLastMessageWithUser, hasUnreadMessages, forceUpdate]); // Dodajemy forceUpdate jako zależność

  // Filtrowanie użytkowników na podstawie wyszukiwania
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return sortedUsers;
    
    const query = searchQuery.toLowerCase();
    return sortedUsers.filter(user => 
      user.firstName.toLowerCase().includes(query) || 
      user.lastName.toLowerCase().includes(query) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(query) || 
      (user.login && user.login.toLowerCase().includes(query))
    );
  }, [sortedUsers, searchQuery]);

  // Funkcja renderująca rolę użytkownika
  const renderUserRoles = (roles) => {
    if (!roles || roles.length === 0) return null;
    
    return (
      <div className="text-xs text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">
        {roles[0]}
      </div>
    );
  };

  // Funkcja renderująca ostatnią wiadomość
  const renderLastMessage = (userId) => {
    const lastMessage = getLastMessageWithUser(userId);
    if (!lastMessage) return null;
    
    const isSentByMe = lastMessage.senderId === user?.id;
    const shortContent = lastMessage.isDeleted 
      ? "Wiadomość usunięta" 
      : (lastMessage.content.length > 20 
        ? `${lastMessage.content.substring(0, 20)}...` 
        : lastMessage.content);
    
    return (
      <div className="flex items-center justify-between w-full mt-1">
        <div className={`text-xs truncate flex-1 ${
          !isSentByMe && !lastMessage.isRead && !lastMessage.isDeleted ? 'text-black font-semibold' : 'text-gray-500'
        }`}>
          <span className="font-medium">{isSentByMe ? "Ty: " : ""}</span>
          {shortContent}
        </div>
        <div className="text-xs text-gray-400 ml-1 whitespace-nowrap">
          {formatTime(lastMessage.createdAt)}
        </div>
      </div>
    );
  };

  // Sprawdzanie statusu online użytkownika
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.includes(userId);
  }, [onlineUsers]);

  // Renderowanie stanu ładowania
  const renderLoadingState = () => {
    if (loading) {
      return <div className="p-4 text-center text-gray-500">Ładowanie użytkowników...</div>;
    } 
    
    if (!lastMessagesLoaded && users.length > 0) {
      return <div className="p-2 text-center text-gray-500 text-xs">Ładowanie wiadomości...</div>;
    }
    
    return null;
  };

  return (
    <div className="w-full h-full bg-white overflow-y-auto flex flex-col">
      <div className="p-2 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-medium">Wiadomości</h2>
          <div className="flex items-center space-x-2">
            <button 
              onClick={toggleOnlineStatusVisibility}
              className="p-1 rounded-full hover:bg-gray-100"
              title={hideOnlineStatus ? "Pokaż statusy aktywności innych" : "Ukryj statusy aktywności innych"}
            >
              {hideOnlineStatus ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button 
              onClick={toggleMyVisibility}
              className={`p-1 rounded-full ${hideMyOnlineStatus ? 'bg-gray-100 text-red-500' : 'hover:bg-gray-100 text-green-500'}`}
              title={hideMyOnlineStatus ? "Pokaż mój status online" : "Ukryj mój status online"}
            >
              {hideMyOnlineStatus ? <UserX size={16} /> : <UserCheck size={16} />}
            </button>
          </div>
        </div>
        
        {/* Wyszukiwarka */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Szukaj użytkownika..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <span className="text-gray-400 hover:text-gray-600">×</span>
            </button>
          )}
        </div>
      </div>
      
      {renderLoadingState()}
      
      <ul className="p-2 space-y-1 overflow-y-auto flex-1">
        {filteredUsers?.length > 0 ? (
          filteredUsers.map((chatUser) => {
            const isOnline = isUserOnline(chatUser.id);
            const unreadCount = getUnreadCount(chatUser.id);
            const isSelected = selectedUser?.id === chatUser.id;
            const hasUnread = hasUnreadMessages(chatUser.id);
            
            return (
              <li
                key={chatUser.id}
                onClick={() => onSelectUser(chatUser)}
                className={`cursor-pointer p-3 rounded-lg hover:bg-gray-100 flex flex-col ${
                  isSelected ? 'bg-blue-50' : (hasUnread ? 'bg-indigo-50 border-l-4 border-indigo-500' : '')
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {!hideOnlineStatus && (
                      <div className={`relative w-2 h-2 rounded-full mr-2 ${
                        isOnline ? 'bg-green-500' : 'bg-gray-400'
                      }`}>
                        {isOnline && (
                          <span className="absolute -top-1 -left-1 w-4 h-4 bg-green-500 opacity-30 rounded-full animate-ping"></span>
                        )}
                      </div>
                    )}
                    <span className={hasUnread ? 'font-semibold' : ''}>{chatUser.firstName} {chatUser.lastName}</span>
                    
                    {/* Dodaj licznik nieprzeczytanych wiadomości */}
                    {unreadCount > 0 && (
                      <div className="ml-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </div>
                  {renderUserRoles(chatUser.roles)}
                </div>
                {renderLastMessage(chatUser.id)}
              </li>
            );
          })
        ) : searchQuery ? (
          <li className="p-4 text-center text-gray-500">Brak wyników dla "{searchQuery}"</li>
        ) : (
          <li className="p-4 text-center text-gray-500">Brak dostępnych użytkowników</li>
        )}
      </ul>
      
      {hideMyOnlineStatus && (
        <div className="px-2 py-1 bg-gray-50 border-t text-xs text-center text-gray-500">
          Twój status: niewidoczny
        </div>
      )}
    </div>
  );
};

export default UserListSidebar;
