import { api } from '@/services/api';
import { normalizeGenre, normalizeProvider, toList } from '@/services/normalize';
import type { Genre, Id, Provider } from '@/types/models';

// GET /movies/genres
export async function getGenres(): Promise<Genre[]> {
  return toList(await api<unknown>('/movies/genres')).map(normalizeGenre);
}

// GET /movies/providers
export async function getProviders(): Promise<Provider[]> {
  return toList(await api<unknown>('/movies/providers')).map(normalizeProvider);
}

// PUT /me/preferences  { genreIds, providerIds }  (țara rămâne cea setată pe server, DEFAULT_COUNTRY)
export async function savePreferences(genreIds: Id[], providerIds: Id[]) {
  await api('/me/preferences', { method: 'PUT', body: { genreIds, providerIds } });
}
