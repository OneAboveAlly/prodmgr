// src/modules/notifications/hooks/useSocketNotifications.js
import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '@/contexts/AuthContext';

let socket;

const useSocketNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

    // ✅ tylko raz twórz socket po stronie klienta
    socket = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket'], // ważne: tylko websockety, bez long-polling
    });

    socket.on('connect', () => {
      console.log('✅ Socket połączony:', socket.id);
    });

    const eventName = `notification:${user.id}`;

    socket.on(eventName, (newNotification) => {
      console.log('🔴 Nowe powiadomienie:', newNotification);
      queryClient.invalidateQueries(['notifications']);
    });

    return () => {
      socket.disconnect(); // ✅ czyść po odmontowaniu
    };
  }, [user, queryClient]);
};

export const useMarkAllAsRead = (userId) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => axios.patch(`/api/notifications/mark-all-read/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });
};

export default useSocketNotifications;
