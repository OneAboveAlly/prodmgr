import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

const socket = io(import.meta.env.VITE_API_URL, {
  withCredentials: true,
});

export const useSocketNotifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const eventName = `notification:${user.id}`;

    socket.on(eventName, (newNotification) => {
      console.log('🔴 Nowe powiadomienie:', newNotification);
      queryClient.invalidateQueries(['notifications']);
    });

    return () => {
      socket.off(eventName);
    };
  }, [user, queryClient]);
};
