import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User } from '@/types';

export function useMe() {
  return useQuery<User>({
    queryKey: ['me'],
    queryFn: async () => {
      const { data } = await api.get('/users/me');
      return data.data;
    },
    retry: false,
  });
}
