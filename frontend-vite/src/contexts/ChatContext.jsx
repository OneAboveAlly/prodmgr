import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { socket } from '@/socket';
import api from '@/services/api.service';
import { useAuth } from './AuthContext';

// Tworzenie kontekstu czatu
const ChatContext = createContext();

// Funkcja do śledzenia przetworzonych wiadomości - ale tylko w bieżącej sesji
// aby uniknąć duplikatów podczas działania aplikacji
const createMessageTracker = () => {
  const processed = new Set();
  
  return {
    isProcessed: (messageId) => processed.has(messageId),
    markProcessed: (messageId) => processed.add(messageId),
    clear: () => processed.clear()
  };
};

// Klucz localStorage do zapisywania preferencji ukrywania statusu
const HIDE_ONLINE_STATUS_KEY = 'chat_hide_online_status';

export function ChatProvider({ children }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [messages, setMessages] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [isMinimized, setIsMinimized] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastMessagesLoaded, setLastMessagesLoaded] = useState(false);
  const [hideMyOnlineStatus, setHideMyOnlineStatus] = useState(() => {
    // Wczytaj zapisaną wartość z localStorage przy inicjalizacji
    const savedStatus = localStorage.getItem(HIDE_ONLINE_STATUS_KEY);
    return savedStatus === 'true';
  });
  
  // Referencje do przechowywania danych, aby uniknąć nadmiarowych renderów
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  
  const selectedUserRef = useRef(selectedUser);
  selectedUserRef.current = selectedUser;
  
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;
  
  // Flaga do śledzenia czy już załadowano użytkowników
  const usersLoadedRef = useRef(false);
  
  // Tracker wiadomości - tylko dla bieżącej sesji
  const messageTracker = useRef(createMessageTracker());

  // Pobieranie listy użytkowników - ale tylko raz, gdy użytkownik jest dostępny
  useEffect(() => {
    // Wyjdź jeśli nie ma zalogowanego użytkownika lub już załadowano użytkowników
    if (!user || usersLoadedRef.current) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await api.get('/chat/users');
        
        // Obsługujemy różne struktury odpowiedzi z API
        let fetchedUsers = [];
        if (Array.isArray(res.data)) {
          fetchedUsers = res.data;
        } else if (Array.isArray(res.data.users)) {
          fetchedUsers = res.data.users;
        } else {
          console.warn('⚠️ Nieoczekiwana struktura odpowiedzi API:', res.data);
          fetchedUsers = [];
        }

        setUsers(fetchedUsers);
        usersLoadedRef.current = true; // Oznacz, że użytkownicy zostali załadowani
        
        // Po załadowaniu użytkowników, pobieramy ostatnie wiadomości dla każdego z nich
        if (fetchedUsers.length > 0) {
          fetchAllLastMessages(fetchedUsers);
        }
      } catch (err) {
        console.error('❌ Błąd ładowania użytkowników czatu:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [user]);

  // Nasłuchiwanie na zmiany stanu widoczności z serwera
  useEffect(() => {
    if (!user) return;
    
    const handleVisibilityState = (data) => {
      const { isHidden } = data;
      console.log('📡 Otrzymano stan widoczności z serwera:', isHidden);
      
      // Aktualizujemy stan tylko jeśli się różni, aby uniknąć niepotrzebnych zmian
      if (isHidden !== hideMyOnlineStatus) {
        setHideMyOnlineStatus(isHidden);
        localStorage.setItem(HIDE_ONLINE_STATUS_KEY, isHidden.toString());
      }
    };
    
    socket.on('chat:visibilityState', handleVisibilityState);
    
    // Sprawdź aktualny stan widoczności po połączeniu
    if (user.id) {
      socket.emit('chat:checkVisibility', { userId: user.id });
    }
    
    return () => {
      socket.off('chat:visibilityState', handleVisibilityState);
    };
  }, [user, hideMyOnlineStatus]);

  // Efekt dla ukrywania statusu online
  useEffect(() => {
    if (!user) return;
    
    // Wysyłamy aktualizację statusu widoczności przy zmianie
    socket.emit('chat:toggleVisibility', {
      userId: user.id,
      isHidden: hideMyOnlineStatus
    });
    
    // Zapisujemy wybór w localStorage dla przyszłych wizyt
    localStorage.setItem(HIDE_ONLINE_STATUS_KEY, hideMyOnlineStatus.toString());
    
  }, [hideMyOnlineStatus, user]);

  // Funkcja pobierająca ostatnią wiadomość dla każdego użytkownika
  const fetchAllLastMessages = async (usersList) => {
    if (!user) return;
    
    try {
      // Pobieramy wszystkie konwersacje użytkownika
      const { data: allMessages } = await api.get('/chat');
      
      if (!Array.isArray(allMessages)) {
        console.warn('⚠️ Nieoczekiwany format danych konwersacji:', allMessages);
        return;
      }
      
      // Grupujemy wiadomości według użytkownika
      const messagesByUser = {};
      
      allMessages.forEach(message => {
        // Określamy ID drugiej strony konwersacji
        const otherUserId = message.senderId === user.id ? message.receiverId : message.senderId;
        
        if (!messagesByUser[otherUserId]) {
          messagesByUser[otherUserId] = [];
        }
        
        // Dodajemy wiadomość do odpowiedniego użytkownika
        messagesByUser[otherUserId].push(message);
        
        // Oznaczamy wiadomość jako przetworzoną
        if (message.id) {
          messageTracker.current.markProcessed(message.id);
        }
      });
      
      // Dla każdego użytkownika sortujemy wiadomości wg daty (najstarsze pierwsze)
      Object.keys(messagesByUser).forEach(userId => {
        messagesByUser[userId].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
      
      // Aktualizujemy stan wiadomości
      setMessages(messagesByUser);
      setLastMessagesLoaded(true);
      
    } catch (err) {
      console.error('❌ Błąd pobierania ostatnich wiadomości:', err);
    }
  };

  // Reset stanu przy wylogowaniu 
  useEffect(() => {
    if (!user) {
      setMessages({});
      setUsers([]);
      setOnlineUsers([]);
      setSelectedUser(null);
      setIsOpen(false);
      usersLoadedRef.current = false;
      setLastMessagesLoaded(false);
      messageTracker.current.clear();
    }
  }, [user]);

  // Obsługa socketów - status online
  useEffect(() => {
    if (!user) return;

    const handleOnlineUsers = (onlineIds) => {
      setOnlineUsers(onlineIds);
    };

    socket.on('chat:onlineUsers', handleOnlineUsers);
    
    // Emituj tylko raz przy montowaniu, nie przy każdej zmianie
    socket.emit('chat:getOnlineUsers');
    
    // Rejestracja w socketach
    socket.emit('register', user.id);

    return () => {
      socket.off('chat:onlineUsers', handleOnlineUsers);
    };
  }, [user]);

  // Nasłuchiwanie na nowe wiadomości przychodzące przez socket
  useEffect(() => {
    if (!user) return;

    const handleNewMessage = (newMsg) => {
      // Identyfikacja konwersacji
      const conversationId = newMsg.senderId === user.id 
        ? newMsg.receiverId 
        : newMsg.senderId;
      
      // Sprawdź, czy wiadomość ma unikalne ID
      if (!newMsg.id) {
        console.warn('⚠️ Otrzymano wiadomość bez ID:', newMsg);
        return;
      }
      
      // Sprawdź, czy ta wiadomość została już przetworzona w tej sesji
      if (messageTracker.current.isProcessed(newMsg.id)) {
        return; // Pomiń wiadomość, jeśli już ją przetwarzaliśmy w tej sesji
      }
      
      // Oznacz wiadomość jako przetworzoną w tej sesji
      messageTracker.current.markProcessed(newMsg.id);
      
      // Aktualizuj wiadomości dla danej konwersacji
      setMessages(prev => {
        const prevMessages = prev[conversationId] || [];
        
        // Sprawdź czy wiadomość już istnieje w tablicy wiadomości
        if (prevMessages.some(msg => msg.id === newMsg.id)) {
          return prev;
        }
        
        return {
          ...prev,
          [conversationId]: [...prevMessages, newMsg]
        };
      });

      // Zwiększ licznik nieprzeczytanych wiadomości jeśli pochodzi od kogoś innego
      if (newMsg.senderId !== user.id) {
        if (!isOpenRef.current || (selectedUserRef.current?.id !== newMsg.senderId)) {
          setUnreadCount(prev => prev + 1);
        }
      }
    };

    socket.on('message:receive', handleNewMessage);

    return () => {
      socket.off('message:receive', handleNewMessage);
    };
  }, [user]);

  // Nasłuchiwanie na usunięte wiadomości przychodzące przez socket
  useEffect(() => {
    if (!user) return;

    const handleMessageDeleted = (data) => {
      const { messageId, deletedContent } = data;
      console.log('📣 Otrzymano zdarzenie message:deleted', { messageId, deletedContent });
      
      // Aktualizuj wiadomość jako usuniętą we wszystkich rozmowach
      setMessages(prev => {
        // Tworzymy nowy obiekt stanu, aby React wykrył zmianę
        const updatedMessages = {...prev};
        let messageFound = false;
        
        // Przeszukaj wszystkie konwersacje
        Object.keys(prev).forEach(conversationId => {
          // Sprawdź czy wiadomość jest w tej konwersacji
          const updatedConversation = prev[conversationId].map(msg => {
            if (msg.id === messageId) {
              messageFound = true;
              return { 
                ...msg, 
                content: deletedContent || "Wiadomość została usunięta", 
                isDeleted: true 
              };
            }
            return msg;
          });
          
          // Dodaj zaktualizowaną konwersację do nowego stanu
          updatedMessages[conversationId] = updatedConversation;
        });
        
        console.log('Znaleziono i zaktualizowano wiadomość:', messageFound);
        
        return messageFound ? updatedMessages : prev;
      });
    };

    socket.on('message:deleted', handleMessageDeleted);

    return () => {
      socket.off('message:deleted', handleMessageDeleted);
    };
  }, [user]);

  // Pobieranie wiadomości dla wybranego użytkownika
  const fetchMessagesForUser = useCallback(async (userId) => {
    if (!userId || !user) return;
    
    try {
      const { data } = await api.get(`/chat/${userId}`);
      
      if (!Array.isArray(data)) {
        console.warn('⚠️ Nieoczekiwany format wiadomości:', data);
        return;
      }
      
      // Aktualizujemy tracker wiadomości, aby uniknąć duplikowania w tej sesji
      data.forEach(msg => {
        if (msg.id) {
          messageTracker.current.markProcessed(msg.id);
        }
      });
      
      // Zawsze aktualizuj stan wiadomości z nowymi danymi z API
      setMessages(prev => {
        // Sortuj wiadomości wg czasu utworzenia (najstarsze pierwsze)
        const sortedMessages = [...data].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        
        return {
          ...prev,
          [userId]: sortedMessages
        };
      });
      
      // Oznacz wszystkie wiadomości od wybranego użytkownika jako przeczytane
      await markMessagesAsRead(userId);
    } catch (err) {
      console.error('❌ Błąd pobierania wiadomości:', err);
    }
  }, [user]);

  // Oznaczanie wiadomości jako przeczytanych
  const markMessagesAsRead = useCallback(async (senderId) => {
    if (!user || !senderId) return;
    
    try {
      // Oznacz wiadomości jako przeczytane w bazie danych
      await api.post(`/chat/${senderId}/read`);
      
      // Aktualizuj lokalny stan wiadomości
      setMessages(prev => {
        // Jeśli nie ma wiadomości od tego użytkownika, nic nie zmieniaj
        if (!prev[senderId]) return prev;
        
        // Zaktualizuj status odczytania dla wszystkich wiadomości od tego użytkownika
        const updatedMessages = prev[senderId].map(msg => {
          // Aktualizuj tylko wiadomości od wybranego użytkownika
          if (msg.senderId === senderId && !msg.isRead) {
            return { ...msg, isRead: true };
          }
          return msg;
        });
        
        // Emituj zdarzenie socket, informując nadawcę, że jego wiadomości zostały odczytane
        socket.emit('message:read', {
          senderId: user.id,
          receiverId: senderId
        });
        
        return {
          ...prev,
          [senderId]: updatedMessages
        };
      });
    } catch (err) {
      console.error('❌ Błąd oznaczania wiadomości jako przeczytanych:', err);
    }
  }, [user]);

  // Nasłuchiwanie na potwierdzenia odczytania wiadomości
  useEffect(() => {
    if (!user) return;
    
    const handleMessagesRead = (data) => {
      const { senderId, receiverId } = data;
      
      // Aktualizujemy tylko jeśli to nasze wiadomości zostały odczytane
      if (receiverId !== user.id) return;
      
      setMessages(prev => {
        // Jeśli nie ma wiadomości dla tego użytkownika, nic nie zmieniaj
        if (!prev[senderId]) return prev;
        
        // Zaktualizuj status odczytania dla wszystkich wiadomości do tego użytkownika
        const updatedMessages = prev[senderId].map(msg => {
          // Aktualizuj tylko nasze wiadomości wysłane do tego użytkownika
          if (msg.senderId === user.id && msg.receiverId === senderId && !msg.isRead) {
            return { ...msg, isRead: true };
          }
          return msg;
        });
        
        return {
          ...prev,
          [senderId]: updatedMessages
        };
      });
    };
    
    socket.on('message:read', handleMessagesRead);
    
    return () => {
      socket.off('message:read', handleMessagesRead);
    };
  }, [user]);

  // Wysyłanie nowej wiadomości
  const sendMessage = useCallback(async (receiverId, content) => {
    if (!user || !content.trim()) return;

    try {
      const res = await api.post(`/chat/${receiverId}`, { content });
      
      // Upewnij się, że wiadomość ma unikalne ID
      if (!res.data.id) {
        console.warn('⚠️ Wysłana wiadomość nie ma ID:', res.data);
      } else {
        // Oznacz jako przetworzoną aby uniknąć duplikatu w tej sesji
        messageTracker.current.markProcessed(res.data.id);
      }
      
      // Emit socket event
      socket.emit('message:send', {
        senderId: user.id,
        receiverId,
        content,
        id: res.data.id
      });
      
      // Aktualizuj lokalny stan
      setMessages(prev => {
        const prevMessages = prev[receiverId] || [];
        
        // Sprawdź czy wiadomość już istnieje
        if (res.data.id && prevMessages.some(msg => msg.id === res.data.id)) {
          return prev;
        }
        
        return {
          ...prev,
          [receiverId]: [...prevMessages, res.data]
        };
      });

      return res.data;
    } catch (err) {
      console.error('❌ Błąd wysyłania wiadomości:', err);
      return null;
    }
  }, [user]);

  // Funkcja do usuwania wiadomości
  const deleteMessage = useCallback(async (messageId) => {
    if (!user) return false;
    
    try {
      const response = await api.delete(`/chat/${messageId}`);
      console.log('✅ Wiadomość usunięta, odpowiedź:', response.data);
      
      // Zaktualizuj lokalnie stan wiadomości natychmiast po pomyślnym usunięciu
      setMessages(prev => {
        const updatedMessages = { ...prev };
        let messageFound = false;
        
        // Przeszukaj wszystkie konwersacje
        Object.keys(updatedMessages).forEach(conversationId => {
          updatedMessages[conversationId] = updatedMessages[conversationId].map(msg => {
            if (msg.id === messageId) {
              messageFound = true;
              return { 
                ...msg, 
                content: response.data.deletedContent || "Wiadomość została usunięta", 
                isDeleted: true 
              };
            }
            return msg;
          });
        });
        
        // Zwróć zaktualizowany stan tylko jeśli znaleziono wiadomość
        return messageFound ? updatedMessages : prev;
      });
      
      // Dodatkowo wyślij event przez socket, aby powiadomić innych użytkowników
      // (dzięki temu nie musimy czekać na response z serwera)
      socket.emit('message:delete', {
        messageId
      });
      
      return true;
    } catch (err) {
      console.error('❌ Błąd usuwania wiadomości:', err);
      return false;
    }
  }, [user]);

  // Toggle otwierania/zamykania widgetu
  const toggleChat = useCallback(() => {
    setIsOpen(prev => !prev);
    if (!isOpenRef.current) {
      setUnreadCount(0); // Resetuj licznik nieprzeczytanych wiadomości przy otwarciu
    }
  }, []);

  // Zaznaczanie użytkownika do rozmowy
  const selectUser = useCallback(async (selectedUserData) => {
    // Sprawdzamy, czy selectedUserData nie jest null
    if (!selectedUserData) {
      setSelectedUser(null);
      return;
    }
    
    // Sprawdzamy, czy selectedUserData ma właściwość id
    if (!selectedUserData.id) {
      console.error('❌ Błąd: Przekazany użytkownik nie ma właściwości id', selectedUserData);
      return;
    }
    
    setSelectedUser(selectedUserData);
    setIsMinimized(false);
    
    // Zawsze pobieramy wiadomości dla użytkownika, niezależnie czy już były w stanie
    await fetchMessagesForUser(selectedUserData.id);
    
    setUnreadCount(0);
  }, [fetchMessagesForUser]);

  // Minimalizowanie/maksymalizowanie chatu
  const toggleMinimize = useCallback(() => {
    setIsMinimized(prev => !prev);
  }, []);
  
  // Funkcja do przełączania widoczności statusu online
  const toggleMyVisibility = useCallback(() => {
    setHideMyOnlineStatus(prev => !prev);
  }, []);

  // Wartości w kontekście są teraz zmemoizowane
  const contextValue = {
    isOpen,
    setIsOpen,
    selectedUser,
    users,
    onlineUsers,
    messages,
    unreadCount,
    isMinimized,
    loading,
    lastMessagesLoaded,
    hideMyOnlineStatus,
    toggleChat,
    selectUser,
    toggleMinimize,
    sendMessage,
    fetchMessagesForUser,
    deleteMessage,
    toggleMyVisibility,
    markMessagesAsRead
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  return useContext(ChatContext);
}