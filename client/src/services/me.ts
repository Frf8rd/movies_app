import { api } from '@/services/api';
import { normalizeHistory, normalizeMovie, normalizeProfile, normalizeStats, toList } from '@/services/normalize';
import { useAuth } from '@/store/auth';
import type { HistoryEntry, Id, Movie, Profile, Stats } from '@/types/models';

// GET /auth/me (utilizator + preferințe)
export async function getProfile(): Promise<Profile> {
  return normalizeProfile(await api<any>('/auth/me'));
}

// GET /me/stats
export async function getStats(): Promise<Stats> {
  return normalizeStats(await api<any>('/me/stats'));
}

// GET /me/watchlist
export async function getWatchlist(): Promise<Movie[]> {
  return toList<any>(await api<unknown>('/me/watchlist')).map((i) => normalizeMovie(i.movie ?? i));
}
// POST /me/watchlist  { movieId }
export const addToWatchlist = (movieId: Id) => api('/me/watchlist', { method: 'POST', body: { movieId } });
// DELETE /me/watchlist/:movieId
export const removeFromWatchlist = (movieId: Id) => api(`/me/watchlist/${movieId}`, { method: 'DELETE' });

// GET /me/history
export async function getHistory(): Promise<HistoryEntry[]> {
  return toList(await api<unknown>('/me/history')).map(normalizeHistory);
}
// PATCH /me/history/:id  { myRating }
export const rateHistory = (id: Id, myRating: number) => api(`/me/history/${id}`, { method: 'PATCH', body: { myRating } });

// PATCH /me  { name }
export async function updateMe(name: string) {
  await api('/me', { method: 'PATCH', body: { name } });
  const u = useAuth.getState().user;
  if (u) useAuth.getState().setUser({ ...u, name });
}

// POST /auth/change-password  { oldPassword, newPassword }
export const changePassword = (oldPassword: string, newPassword: string) =>
  api('/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } });

// DELETE /me  (șterge contul și toate datele)
export async function deleteAccount() {
  await api('/me', { method: 'DELETE' });
  await useAuth.getState().logout();
}
