import { api } from '@/services/api';
import { normalizeMovie, toList } from '@/services/normalize';
import type { Movie } from '@/types/models';

// GET /movies/trending
export async function getTrending(): Promise<Movie[]> {
  const data = await api<unknown>('/movies/trending');
  return toList(data).map(normalizeMovie);
}
