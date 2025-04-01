// src/socket.js
import { io } from 'socket.io-client';

// Tworzymy funkcję, która inicjalizuje socket z ID użytkownika
const initSocket = () => {
  // Pobranie tokenu i ID użytkownika
  const token = localStorage.getItem('accessToken');
  
  // Próbujemy pobrać ID użytkownika z localStorage jeśli jest zapisane
  // lub możesz zaktualizować to, aby pobierać ID z innego miejsca zgodnie z twoją implementacją
  const userId = localStorage.getItem('userId');

  // Inicjalizacja socketu z danymi autoryzacji
  const socket = io(import.meta.env.VITE_SOCKET_URL, {
    withCredentials: true,
    auth: {
      token,
      userId
    }
  });

  // Logowanie zdarzeń połączenia
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });
  
  socket.on('connect_error', (err) => {
    console.error('❌ Socket connect error:', err.message);
  });

  return socket;
};

// Eksportujemy instancję socketu
export const socket = initSocket();
