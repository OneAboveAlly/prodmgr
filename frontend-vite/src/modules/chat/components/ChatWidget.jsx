import React, { useCallback } from 'react';
import { useChat } from '@/contexts/ChatContext';
import { MessageCircle, X, Minimize, Maximize, Users } from 'lucide-react';
import clsx from 'clsx';
import UserListSidebar from './UserListSidebar';
import ChatBox from './ChatBox';

const ChatWidget = () => {
  const { 
    isOpen, 
    toggleChat, 
    selectedUser, 
    selectUser, 
    unreadCount, 
    isMinimized,
    toggleMinimize
  } = useChat();
  
  // Memoizujemy funkcję zamknięcia, aby uniknąć re-renderów
  const handleClose = useCallback(() => {
    if (selectedUser) {
      // Jeśli mamy wybranego użytkownika, wracamy do listy
      selectUser(null);
    } else {
      // Jeśli jesteśmy na liście, zamykamy widget
      toggleChat();
    }
  }, [selectedUser, selectUser, toggleChat]);

  // Zapobieganie renderowaniu zawartości, gdy jest zminimalizowany lub zamknięty
  const renderContent = isOpen && !isMinimized;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
      {/* Pływający przycisk czatu */}
      <button
        onClick={toggleChat}
        className={clsx(
          "flex items-center justify-center rounded-full shadow-lg transition-all",
          isOpen ? "bg-red-500 hover:bg-red-600" : "bg-indigo-600 hover:bg-indigo-700",
          isOpen ? "w-12 h-12" : "w-14 h-14"
        )}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-7 h-7 text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Okno czatu - renderujemy tylko gdy jest otwarte */}
      {isOpen && (
        <div 
          className={clsx(
            "bg-white rounded-lg shadow-2xl transition-all duration-300 mb-3 flex flex-col overflow-hidden",
            isMinimized ? "h-14 w-80" : "h-[500px] w-80"
          )}
        >
          {/* Nagłówek okna czatu */}
          <div className="bg-indigo-600 text-white p-3 flex justify-between items-center">
            <div className="flex items-center">
              {selectedUser ? (
                <div className="text-sm font-medium truncate flex items-center">
                  {selectedUser.firstName} {selectedUser.lastName}
                </div>
              ) : (
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Wiadomości</span>
                </div>
              )}
            </div>
            <div className="flex items-center">
              <button 
                onClick={toggleMinimize} 
                className="text-white mr-2 hover:bg-indigo-700 rounded p-1"
              >
                {isMinimized ? <Maximize className="w-4 h-4" /> : <Minimize className="w-4 h-4" />}
              </button>
              <button 
                onClick={handleClose}
                className="text-white hover:bg-indigo-700 rounded p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Zawartość okna czatu - renderujemy tylko gdy nie jest zminimalizowane */}
          {renderContent && (
            <div className="flex flex-grow overflow-hidden h-full">
              {selectedUser ? (
                <ChatBox selectedUser={selectedUser} />
              ) : (
                <UserListSidebar onSelectUser={selectUser} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Używamy React.memo aby zapobiec zbędnym re-renderom
export default React.memo(ChatWidget);