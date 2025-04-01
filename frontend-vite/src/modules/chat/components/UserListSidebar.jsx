import React, { useState, useMemo } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Search, UserCheck, UserX } from 'lucide-react';

const UserListSidebar = ({ onSelectUser }) => {
  const { user } = useAuth();
  const { users, onlineUsers, loading, messages, lastMessagesLoaded, hideMyOnlineStatus, toggleMyVisibility } = useChat();
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleOnlineStatusVisibility = () => {
    setHideOnlineStatus(!hideOnlineStatus);
  };

  // Funkcja pomocnicza do pobierania ostatnich wiadomości z każdym użytkownikiem
  const getLastMessageWithUser = (userId) => {
    const userMessages = messages[userId] || [];
    return userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
  };

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

  // Sortujemy użytkowników według czasu ostatniej wiadomości
  const sortedUsers = useMemo(() => {
    if (!users || users.length === 0) return [];
    
    // Czekamy aż wiadomości zostaną załadowane, aby poprawnie posortować
    if (!lastMessagesLoaded && Object.keys(messages).length === 0) {
      return [...users]; // Zwróć użytkowników w domyślnej kolejności, jeśli wiadomości jeszcze nie są gotowe
    }
    
    return [...users].sort((a, b) => {
      const lastMessageA = getLastMessageWithUser(a.id);
      const lastMessageB = getLastMessageWithUser(b.id);
      
      const timeA = lastMessageA ? new Date(lastMessageA.createdAt).getTime() : 0;
      const timeB = lastMessageB ? new Date(lastMessageB.createdAt).getTime() : 0;
      
      return timeB - timeA; // Sortuj malejąco (najnowsze na górze)
    });
  }, [users, messages, lastMessagesLoaded]);

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
        <div className="text-xs text-gray-500 truncate flex-1">
          <span className="font-medium">{isSentByMe ? "Ty: " : ""}</span>
          {shortContent}
        </div>
        <div className="text-xs text-gray-400 ml-1 whitespace-nowrap">
          {formatTime(lastMessage.createdAt)}
        </div>
      </div>
    );
  };

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
          filteredUsers.map((user) => (
            <li
              key={user.id}
              onClick={() => onSelectUser(user)}
              className="cursor-pointer p-3 rounded-lg hover:bg-gray-100 flex flex-col"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {!hideOnlineStatus && (
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      onlineUsers.includes(user.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  )}
                  <span>{user.firstName} {user.lastName}</span>
                </div>
                {renderUserRoles(user.roles)}
              </div>
              {renderLastMessage(user.id)}
            </li>
          ))
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
