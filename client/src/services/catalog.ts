import { ApiError, api } from '@/services/api';
import { normalizeGenre, normalizeProvider, toList } from '@/services/normalize';
import type { Genre, Id, Provider } from '@/types/models';

// În dezvoltare, fără backend pornit, folosim liste locale (id-uri TMDB) ca să poți vedea ecranele.
// În producție (sau când serverul răspunde) se folosesc doar datele reale.
const FALLBACK_GENRES: Genre[] = [
  { id: 28, name: 'Action' }, { id: 35, name: 'Comedy' }, { id: 18, name: 'Drama' },
  { id: 27, name: 'Horror' }, { id: 878, name: 'Sci-Fi' }, { id: 53, name: 'Thriller' },
  { id: 10749, name: 'Romance' }, { id: 14, name: 'Fantasy' }, { id: 99, name: 'Documentary' },
  { id: 16, name: 'Animation' }, { id: 80, name: 'Crime' }, { id: 12, name: 'Adventure' },
];
const FALLBACK_PROVIDERS: Provider[] = [
  { id: 8, name: 'Netflix', logoUrl: null }, { id: 1899, name: 'HBO Max', logoUrl: null },
  { id: 9, name: 'Prime Video', logoUrl: null }, { id: 337, name: 'Disney+', logoUrl: null },
  { id: 350, name: 'Apple TV+', logoUrl: null }, { id: 192, name: 'YouTube', logoUrl: null },
];

async function withDevFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (__DEV__ && e instanceof ApiError && e.code === 'NETWORK_ERROR') return fallback;
    throw e;
  }
}

// GET /movies/genres
export const getGenres = () =>
  withDevFallback(async () => toList(await api<unknown>('/movies/genres')).map(normalizeGenre), FALLBACK_GENRES);

// GET /movies/providers
export const getProviders = () =>
  withDevFallback(async () => toList(await api<unknown>('/movies/providers')).map(normalizeProvider), FALLBACK_PROVIDERS);

// țara din setările telefonului (ex. "ro-MD" -> "MD"), necesară pentru platformele disponibile
function deviceCountry(): string {
  try {
    const region = Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1];
    return (region ?? 'US').toUpperCase();
  } catch {
    return 'US';
  }
}

// PUT /me/preferences  { genreIds, providerIds, country }
export async function savePreferences(genreIds: Id[], providerIds: Id[]) {
  await api('/me/preferences', { method: 'PUT', body: { genreIds, providerIds, country: deviceCountry() } });
}
