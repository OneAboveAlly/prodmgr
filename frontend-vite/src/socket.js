// src/socket.js
import { io } from 'socket.io-client';

// Tworzymy funkcję, która inicjalizuje socket z ID użytkownika
const initSocket = () => {
  // Pobranie tokenu i ID użytkownika
  const token = localStorage.getItem('accessToken');
  
  // Próbujemy pobrać ID użytkownika z localStorage jeśli jest zapisane
  const userId = localStorage.getItem('userId');
  
  // Pobieranie stanu widoczności
  const hideOnlineStatus = localStorage.getItem('chat_hide_online_status') === 'true';

  // Inicjalizacja socketu z danymi autoryzacji
  const socket = io(import.meta.env.VITE_SOCKET_URL, {
    withCredentials: true,
    auth: {
      token,
      userId,
      hideOnlineStatus // Dodajemy informację o statusie widoczności
    },
    reconnectionAttempts: 10, // Zwiększamy liczbę prób ponownego połączenia
    reconnectionDelay: 1000, // Opóźnienie między próbami
    timeout: 10000 // Zwiększamy timeout połączenia
  });

  // Logowanie zdarzeń połączenia
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    
    // Rejestracja użytkownika po połączeniu z kompletną informacją
    if (userId) {
      socket.emit('register', { 
        userId, 
        isHidden: hideOnlineStatus 
      });
      
      // Od razu pobieramy status online innych
      socket.emit('chat:getOnlineUsers');
    }
  });
  
  socket.on('connect_error', (err) => {
    console.error('❌ Socket connect error:', err.message);
  });
  
  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
    
    // Automatycznie próbuje się połączyć ponownie, jeśli to nie był celowy disconnect
    if (reason === 'io server disconnect') {
      // Serwer zamknął połączenie, próbujemy ponownie
      socket.connect();
    }
  });
  
  // Kiedy nastąpi odzyskanie połączenia
  socket.on('reconnect', (attemptNumber) => {
    console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
    
    // Odświeżamy rejestrację i statusy po reconnect
    if (userId) {
      socket.emit('register', { 
        userId, 
        isHidden: hideOnlineStatus 
      });
      socket.emit('chat:getOnlineUsers');
    }
  });

  return socket;
};

// Eksportujemy instancję socketu
export const socket = initSocket();

// Eksportujemy funkcję do odświeżenia połączenia po zmianie stanu zalogowania
export const refreshSocketConnection = () => {
  socket.disconnect();
  
  // Krótkie oczekiwanie przed ponownym połączeniem
  setTimeout(() => {
    socket.connect();
  }, 300);
};
