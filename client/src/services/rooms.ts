import { api } from '@/services/api';
import { normalizeMovieDetail, normalizeResults, normalizeRoom, normalizeRoomDetail, toList } from '@/services/normalize';
import { useAuth } from '@/store/auth';
import type { Id, MovieDetail, Progress, Results, Room, RoomDetail, RoomFilters, VoteChoice } from '@/types/models';

// GET /rooms?status=active
export async function getActiveRooms(): Promise<Room[]> {
  const data = await api<unknown>('/rooms?status=active');
  return toList(data).map(normalizeRoom);
}

export type JoinResult = { room: Room; guestToken: string | null };

// POST /rooms/join  { code, nickname? } -> { room, member, guestToken? }
// Public: funcționează și fără token (invitat). Dacă ești logat, trimite tokenul.
export async function joinRoom(code: string, nickname?: string): Promise<JoinResult & { member: any }> {
  const hasToken = !!useAuth.getState().access;
  const data = await api<any>('/rooms/join', {
    method: 'POST',
    body: { code, ...(nickname ? { nickname } : {}) },
    auth: hasToken,
  });
  return { room: normalizeRoom(data.room ?? data), member: data.member ?? null, guestToken: data.guestToken ?? data.guest_token ?? null };
}

// Intră în cameră ca invitat și salvează sesiunea de invitat (guestToken).
export async function joinAsGuest(code: string, nickname: string): Promise<Room> {
  const { room, member, guestToken } = await joinRoom(code, nickname);
  if (!guestToken) throw new Error('Serverul nu a returnat tokenul de invitat.');
  await useAuth.getState().setGuestSession({
    token: guestToken,
    user: { id: member?.id ?? 'guest', name: member?.nickname ?? nickname, email: '', avatarUrl: null },
  });
  return room;
}

// POST /rooms  { title, genreIds, providerIds, maxRuntime, yearFrom, minRating, sourceListId?, deckSize } -> camera + code
export async function createRoom(f: RoomFilters, deckSize = 30, sourceListId?: Id): Promise<Room> {
  const data = await api<any>('/rooms', {
    method: 'POST',
    body: {
      title: f.title,
      genreIds: f.genreIds,
      providerIds: f.providerIds,
      deckSize,
      ...(sourceListId !== undefined ? { sourceListId } : {}),
      ...(f.maxRuntime !== null ? { maxRuntime: f.maxRuntime } : {}),
      ...(f.yearFrom !== null ? { yearFrom: f.yearFrom } : {}),
      ...(f.minRating !== null ? { minRating: f.minRating } : {}),
    },
  });
  return normalizeRoom(data.room ?? data);
}

// GET /rooms  (toate camerele mele)
export async function getRooms(): Promise<Room[]> {
  return toList(await api<unknown>('/rooms')).map(normalizeRoom);
}

// GET /rooms/:id  (status, participanți, filtre) — folosit cu polling
export async function getRoom(id: Id): Promise<RoomDetail> {
  return normalizeRoomDetail(await api<any>(`/rooms/${id}`));
}
// POST /rooms/:id/start  (doar gazda) — 422 dacă filtrele sunt prea stricte
export const startRoom = (id: Id) => api(`/rooms/${id}/start`, { method: 'POST' });
// DELETE /rooms/:id/leave
export const leaveRoom = (id: Id) => api(`/rooms/${id}/leave`, { method: 'DELETE', timeoutMs: 45_000 });
// POST /rooms/:id/close-voting  (doar gazda)
export const closeVoting = (id: Id) => api(`/rooms/${id}/close-voting`, { method: 'POST' });
// POST /rooms/:id/pick  { movieId }
export const pickMovie = (id: Id, movieId: Id) => api(`/rooms/${id}/pick`, { method: 'POST', body: { movieId } });

// GET /rooms/:id/deck  (fără voturile altora; marchează filmele deja votate de mine)
// backend: { roomStatus, total, votedCount, vetoUsed, deck: [{ position, voted, myChoice, movie: {...} }] }
export async function getDeck(id: Id): Promise<MovieDetail[]> {
  const data = await api<any>(`/rooms/${id}/deck`);
  const items: any[] = Array.isArray(data?.deck) ? data.deck : toList(data);
  return items.map((i) => normalizeMovieDetail({ ...(i.movie ?? i), voted: i.voted ?? false }));
}
// POST /rooms/:id/votes  { movieId, choice } — 409 dacă ai votat deja
export const sendVote = (id: Id, movieId: Id, choice: VoteChoice) =>
  api(`/rooms/${id}/votes`, { method: 'POST', body: { movieId, choice }, timeoutMs: 45_000 });

// GET /rooms/:id/progress  (fără voturi, doar cine a terminat)
export async function getProgress(id: Id): Promise<Progress> {
  const d = await api<any>(`/rooms/${id}/progress`);
  return {
    total: Number(d.total ?? 0),
    finishedCount: Number(d.finishedCount ?? d.finished_count ?? 0),
    members: (d.members ?? []).map((m: any) => ({ nickname: String(m.nickname ?? m.name ?? ''), finished: Boolean(m.finished) })),
  };
}

// GET /rooms/:id/results  (403 cât timp se mai votează)
export async function getResults(id: Id): Promise<Results> {
  return normalizeResults(await api<any>(`/rooms/${id}/results`));
}
