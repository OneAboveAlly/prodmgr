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
      const handleNewNotification = (notification) => {
        if (notification.archived) return; // 👈 zapobiegnij wyświetlaniu zarchiwizowanych
        
        // Dodaj nowe powiadomienie do stanu lokalnego
        setNotifications((prev) => {
          // Sprawdź, czy powiadomienie już istnieje w tablicy
          const exists = prev.some(n => n.id === notification.id);
          if (exists) return prev;
          return [notification, ...prev];
        });
        
        // Zwiększ licznik nieprzeczytanych
        setUnreadCount((prev) => prev + 1);
        
        // Wyświetl powiadomienie toast
        // Specjalne formatowanie dla powiadomień produkcyjnych
        if (notification.type === 'PRODUCTION') {
          const emoji = {
            'GUIDE_COMPLETED': '🏆',
            'STEP_COMPLETED': '✅',
            'GUIDE_ASSIGNED': '📋',
            'STEP_ASSIGNED': '📝',
            'GUIDE_ARCHIVED': '🗄️',
            'GUIDE_CREATED': '🆕',
          }[notification.metadata?.productionType] || '🔔';
          
          // Parsuj metadane JSON
          let metadata = null;
          try {
            if (notification.metadata && typeof notification.metadata === 'string') {
              metadata = JSON.parse(notification.metadata);
            } else if (notification.metadata) {
              metadata = notification.metadata;
            }
          } catch (e) {
            console.error('Error parsing notification metadata:', e);
          }
          
          toast.info(`${emoji} ${notification.content}`, {
            autoClose: 5000,
            hideProgressBar: false,
            onClick: () => {
              // Jeśli kliknięto toast, oznacz powiadomienie jako przeczytane
              if (!notification.isRead) {
                markNotificationAsRead(notification.id);
              }
              
              // Jeśli to powiadomienie o przypisaniu do kroku, zapewnij poprawne przekierowanie
              if (metadata?.productionType === 'STEP_ASSIGNED' && notification.link) {
                window.location.href = notification.link;
              }
            }
          });
        } else {
          toast.info(notification.content);
        }

        // ✅ Dodaj do cache React Query (żeby /notifications też je widziało)
        queryClient.invalidateQueries(['notifications']);
      };

      // Nasłuchuj na kanale powiadomień dla konkretnego użytkownika
      socket.on(`notification:${user.id}`, handleNewNotification);
      
      // Nasłuchuj na ogólnym kanale powiadomień (backup)
      socket.on('notification', (data) => {
        if (data.userId === user.id) {
          handleNewNotification(data);
        }
      });
    }

    return () => {
      if (user?.id) {
        socket.off(`notification:${user.id}`);
        socket.off('notification');
      }
    };
  }, [user, queryClient]);

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