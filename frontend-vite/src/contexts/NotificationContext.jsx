import React from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../socket';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
import { useQueryClient } from '@tanstack/react-query';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (user?.id) {
      socket.emit('register', user.id);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      socket.on(`notification:${user.id}`, (notification) => {
        if (notification.archived) return; // 👈 zapobiegnij wyświetlaniu zarchiwizowanych
        
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast.info(notification.content);

        // ✅ Dodaj do cache React Query (żeby /notifications też je widziało)
        queryClient.setQueryData(['notifications'], (old = []) => [notification, ...old]);
      });
    }

    return () => {
      if (user?.id) {
        socket.off(`notification:${user.id}`);
      }
    };
  }, [user]);

  const markNotificationAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        setNotifications,
        setUnreadCount,
        markNotificationAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useLiveNotifications = () => useContext(NotificationContext);