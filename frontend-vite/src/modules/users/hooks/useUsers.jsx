import { useQuery } from '@tanstack/react-query';
import api from '@/services/api.service';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await api.get('/users'); // 👈 upewnij się że backend ma /users
      return res.data.users || [];
    },
  });
};
