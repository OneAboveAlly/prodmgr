import { useQuery } from '@tanstack/react-query';
import userApi from '../../../api/user.api';

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const data = await userApi.getAll(); 
      return data.users || [];
    },
  });
};
