import { api } from '@/services/api';
import { normalizeList, normalizeMovie, toList } from '@/services/normalize';
import type { Id, Movie, MovieList } from '@/types/models';

export const LIST_CATEGORIES = ['Friends', 'Family', 'Couple'] as const;

// GET /lists
export async function getLists(): Promise<MovieList[]> {
  return toList(await api<unknown>('/lists')).map(normalizeList);
}
// POST /lists  { name, category }
export async function createList(name: string, category: string): Promise<MovieList> {
  return normalizeList(await api<any>('/lists', { method: 'POST', body: { name, category } }));
}
// GET /lists/:id
export async function getList(id: Id): Promise<MovieList> {
  return normalizeList(await api<any>(`/lists/${id}`));
}
// PATCH /lists/:id  { name?, category? }
export const updateList = (id: Id, patch: { name?: string; category?: string }) =>
  api(`/lists/${id}`, { method: 'PATCH', body: patch });
// DELETE /lists/:id
export const deleteList = (id: Id) => api(`/lists/${id}`, { method: 'DELETE' });
// POST /lists/:id/items  { movieId }
export const addListItem = (id: Id, movieId: Id) => api(`/lists/${id}/items`, { method: 'POST', body: { movieId } });
// DELETE /lists/:id/items/:movieId
export const removeListItem = (id: Id, movieId: Id) => api(`/lists/${id}/items/${movieId}`, { method: 'DELETE' });

// GET /movies/search?q=
export async function searchMovies(q: string): Promise<Movie[]> {
  return toList(await api<unknown>(`/movies/search?q=${encodeURIComponent(q)}`)).map(normalizeMovie);
}
