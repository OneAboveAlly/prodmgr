import { createContext, useContext, useEffect, useState } from 'react';
import { socket } from '../socket';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      socket.emit('register', user.id);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      socket.on(`notification:${user.id}`, (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
        toast.info(notification.content);
      });
    }

    return () => {
      if (user?.id) {
        socket.off(`notification:${user.id}`);
      }
    };
  }, [user]);

  // 🔧 Dodajemy tę metodę do lokalnej aktualizacji
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
        markNotificationAsRead // 🟢 eksponujemy w kontekście
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useLiveNotifications = () => useContext(NotificationContext);
