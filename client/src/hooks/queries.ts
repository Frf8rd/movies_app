import { useQuery } from '@tanstack/react-query';

import { fetchMe } from '@/services/auth';
import { getTrending } from '@/services/movies';
import { getActiveRooms } from '@/services/rooms';
import { useAuth } from '@/store/auth';

export function useMe() {
  const setUser = useAuth((s) => s.setUser);
  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await fetchMe();
      setUser(user);
      return user;
    },
    staleTime: 5 * 60_000,
  });
}

export const useTrending = () =>
  useQuery({ queryKey: ['movies', 'trending'], queryFn: getTrending, staleTime: 5 * 60_000 });

export const useActiveRooms = () =>
  useQuery({ queryKey: ['rooms', 'active'], queryFn: getActiveRooms, refetchInterval: 10_000 });
