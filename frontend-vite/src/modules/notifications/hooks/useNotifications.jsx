// src/modules/notifications/hooks/useNotifications.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/services/api.service';
import { useAuth } from '@/contexts/AuthContext';

export const useNotifications = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/notifications');
      return res.data.notifications || []; // <- ważne: dopasuj do response
    },
    enabled: !!user,
    staleTime: 0, // <- zawsze traktuj jako nieświeże
  });
};

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
