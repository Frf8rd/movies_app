import { api } from '@/services/api';
import { getGenres, getProviders } from '@/services/catalog';
import { normalizeHistory, normalizeMovie, normalizeProfile, normalizeStats, toList } from '@/services/normalize';
import { useAuth } from '@/store/auth';
import type { HistoryEntry, Id, Movie, Profile, Stats } from '@/types/models';

// GET /auth/me (utilizator + preferințe)
// backend-ul trimite doar id-uri în preferințe (genreIds / providerIds) -> numele le luăm din catalog
export async function getProfile(): Promise<Profile> {
  const [raw, genres, providers] = await Promise.all([
    api<any>('/auth/me'),
    getGenres().catch(() => []),
    getProviders().catch(() => []),
  ]);
  const p = normalizeProfile(raw);
  const g = new Map(genres.map((x) => [String(x.id), x]));
  const pr = new Map(providers.map((x) => [String(x.id), x]));
  return {
    ...p,
    genres: p.genres.map((x) => g.get(String(x.id)) ?? x),
    providers: p.providers.map((x) => pr.get(String(x.id)) ?? x),
  };
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
// backend-ul invalidează tokenurile vechi și întoarce unele noi { access, refresh } -> le salvăm
export async function changePassword(oldPassword: string, newPassword: string) {
  const data = await api<any>('/auth/change-password', { method: 'POST', body: { oldPassword, newPassword } });
  if (data?.access) await useAuth.getState().setSession({ access: data.access, refresh: data.refresh ?? null });
}

// DELETE /me  (șterge contul și toate datele)
export async function deleteAccount() {
  await api('/me', { method: 'DELETE' });
  await useAuth.getState().logout();
}
