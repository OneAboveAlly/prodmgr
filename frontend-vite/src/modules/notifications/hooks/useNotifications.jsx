import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api.service';
import { useAuth } from '@/contexts/AuthContext';

// 📩 Aktywne, niezarchiwizowane powiadomienia (np. dla dzwoneczka)
export const useNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.notifications || [];
    },
    enabled: !!user,
    staleTime: 0,
  });
};

// 📖 Historia powiadomień (w tym zarchiwizowane)
export const useNotificationHistory = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications', 'history'],
    queryFn: async () => {
      const res = await api.get('/notifications/history');
      return res.data.notifications || [];
    },
    enabled: !!user,
    staleTime: 0,
  });
};

// ✅ Oznacz jako przeczytane
export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId) =>
      api.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    },
  });
};
