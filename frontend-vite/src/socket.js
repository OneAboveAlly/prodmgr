// src/socket.js
import { io } from 'socket.io-client';

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
});
socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
  });
  
  socket.on('connect_error', (err) => {
    console.error('❌ Socket connect error:', err.message);
  });
  