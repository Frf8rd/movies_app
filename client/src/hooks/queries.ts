import { useQuery } from '@tanstack/react-query';

import { getList, getLists } from '@/services/lists';
import { getHistory, getProfile, getStats, getWatchlist } from '@/services/me';

import { fetchMe } from '@/services/auth';
import { getGenres, getProviders } from '@/services/catalog';
import { getMovie, getTrending } from '@/services/movies';
import { getActiveRooms, getDeck, getProgress, getResults, getRoom, getRooms } from '@/services/rooms';
import type { Id } from '@/types/models';
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

export const useGenres = () =>
  useQuery({ queryKey: ['movies', 'genres'], queryFn: getGenres, staleTime: 24 * 60 * 60_000 });

export const useProviders = () =>
  useQuery({ queryKey: ['movies', 'providers'], queryFn: getProviders, staleTime: 24 * 60 * 60_000 });

export const useRooms = () => useQuery({ queryKey: ['rooms', 'all'], queryFn: getRooms, refetchInterval: 15_000 });

// polling: lobby-ul și votul văd schimbările de status / participanți
export const useRoom = (id: Id) =>
  useQuery({ queryKey: ['room', String(id)], queryFn: () => getRoom(id), refetchInterval: 3_000 });

export const useDeck = (id: Id) =>
  useQuery({ queryKey: ['room', String(id), 'deck'], queryFn: () => getDeck(id), staleTime: Infinity, gcTime: 0 });

export const useProgress = (id: Id, enabled = true) =>
  useQuery({ queryKey: ['room', String(id), 'progress'], queryFn: () => getProgress(id), refetchInterval: 4_000, enabled });

export const useResults = (id: Id) =>
  useQuery({ queryKey: ['room', String(id), 'results'], queryFn: () => getResults(id), retry: false, refetchInterval: (q) => (q.state.status === 'error' ? 4_000 : false) });

export const useMovie = (id: Id) => useQuery({ queryKey: ['movie', String(id)], queryFn: () => getMovie(id) });

export const useProfile = () => useQuery({ queryKey: ['profile'], queryFn: getProfile });
export const useStats = () => useQuery({ queryKey: ['stats'], queryFn: getStats });
export const useWatchlist = (enabled = true) => useQuery({ queryKey: ['watchlist'], queryFn: getWatchlist, enabled });
export const useHistory = () => useQuery({ queryKey: ['history'], queryFn: getHistory });
export const useLists = () => useQuery({ queryKey: ['lists'], queryFn: getLists });
export const useList = (id: Id) => useQuery({ queryKey: ['lists', String(id)], queryFn: () => getList(id) });
