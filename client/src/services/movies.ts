import { api } from '@/services/api';
import { normalizeMovie, normalizeMovieDetail, toList } from '@/services/normalize';
import type { Id, Movie, MovieDetail } from '@/types/models';

// GET /movies/trending
export async function getTrending(): Promise<Movie[]> {
  const data = await api<unknown>('/movies/trending');
  return toList(data).map(normalizeMovie);
}

// GET /movies/:id  (detalii + platforme + trailer)
export async function getMovie(id: Id): Promise<MovieDetail> {
  return normalizeMovieDetail(await api<any>(`/movies/${id}`));
}
