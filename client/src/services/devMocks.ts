// Date locale pentru „Skip (dev)". Folosite DOAR în __DEV__ și doar când sesiunea e cea falsă.
// Ca să le dezactivezi, șterge blocul `if (__DEV__ && ...)` din services/api.ts.
export const NO_MOCK = Symbol('no-mock');

type Raw = Record<string, any>;
const M = (id: number, title: string, year: number, runtime: number, rating: number, genres: string[], overview: string): Raw => ({
  id, title, year, runtime, rating, genres, overview,
  posterUrl: null, trailerUrl: 'https://www.youtube.com/results?search_query=' + encodeURIComponent(title + ' trailer'),
  providers: [{ id: 8, name: 'Netflix' }, { id: 1899, name: 'HBO Max' }, { id: 9, name: 'Prime Video' }],
});

const MOVIES: Raw[] = [
  M(1, 'Dune: Part Two', 2024, 166, 8.8, ['Action', 'Adventure', 'Drama'], 'Paul Atreides joins the Fremen and sets out to avenge his family while facing a choice that could change the universe.'),
  M(2, 'Interstellar', 2014, 169, 8.6, ['Sci-Fi', 'Drama'], 'A team of explorers travels through a wormhole in search of a new home for humanity.'),
  M(3, 'The Batman', 2022, 176, 7.8, ['Action', 'Crime', 'Thriller'], 'In his second year as a vigilante, Batman follows a trail of clues left by a ruthless killer in Gotham.'),
  M(4, 'Joker', 2019, 122, 8.4, ['Crime', 'Drama', 'Thriller'], 'A struggling comedian drifts into madness and becomes the face of a city in unrest.'),
  M(5, 'Inside Out 2', 2024, 96, 7.8, ['Animation', 'Comedy'], 'Riley turns thirteen and new emotions arrive, shaking up headquarters.'),
  M(6, 'Deadpool & Wolverine', 2024, 128, 7.6, ['Action', 'Comedy'], 'A reluctant hero teams up with a grumpy mutant for a mission that could rewrite everything.'),
  M(7, 'Oppenheimer', 2023, 180, 8.3, ['Drama'], 'The story of the physicist who led the project that built the first atomic bomb.'),
  M(8, 'Parasite', 2019, 132, 8.5, ['Thriller', 'Comedy', 'Drama'], 'A poor family schemes its way into the lives of a wealthy household, with unexpected consequences.'),
  M(9, 'Arrival', 2016, 116, 7.9, ['Sci-Fi', 'Drama'], 'A linguist is recruited to communicate with visitors who have landed on Earth.'),
  M(10, 'Mad Max: Fury Road', 2015, 120, 8.1, ['Action', 'Adventure'], 'In a desert wasteland, a rebel and a drifter race across the sand to escape a tyrant.'),
];
const byId = (id: any) => MOVIES.find((m) => String(m.id) === String(id));
const lite = (m: Raw) => ({ id: m.id, title: m.title, year: m.year, runtime: m.runtime, rating: m.rating, posterUrl: m.posterUrl });

const ME = { id: 'dev', name: 'Alex', email: 'dev@reelmatch.local', avatarUrl: null };
const GENRES = [{ id: 28, name: 'Action' }, { id: 878, name: 'Sci-Fi' }, { id: 53, name: 'Thriller' }, { id: 12, name: 'Adventure' }];
const PROVIDERS = [{ id: 8, name: 'Netflix' }, { id: 1899, name: 'HBO Max' }, { id: 9, name: 'Prime Video' }];

// ---- stare locală (în memorie, se pierde la reload) ----
const watchlist = new Set<number>([1, 2, 3]);
const history: Raw[] = [
  { id: 1, movie: lite(MOVIES[6]), watchedAt: '2026-10-02', myRating: 5 },
  { id: 2, movie: lite(MOVIES[7]), watchedAt: '2026-09-18', myRating: null },
];
let nextList = 3;
const lists: Raw[] = [
  { id: 1, name: 'Friday with friends', category: 'Friends', items: [1, 6, 10] },
  { id: 2, name: 'Date night', category: 'Couple', items: [9, 2] },
];
const members = (finishedExtra: boolean) => [
  { id: 'dev', nickname: 'Alex', isHost: true, isMe: true, finished: finishedExtra },
  { id: 2, nickname: 'Andrei', isHost: false, isMe: false, finished: true },
  { id: 3, nickname: 'Maria', isHost: false, isMe: false, finished: true },
  { id: 4, nickname: 'Diana', isHost: false, isMe: false, finished: true },
];
type MockRoom = Raw & { votes: Record<string, string> };
let nextRoom = 2;
const rooms: Record<string, MockRoom> = {
  'dev-1': { id: 'dev-1', code: 'K7F-29Q', title: 'Movie night', status: 'LOBBY', votes: {}, picked: null, filters: { genres: ['Action', 'Comedy'], providers: ['Netflix', 'HBO Max', 'Prime Video'], maxRuntime: 120, yearFrom: 2020, minRating: 7 } },
};
const roomView = (r: MockRoom) => {
  const done = Object.keys(r.votes).length >= MOVIES.length;
  return { id: r.id, code: r.code, title: r.title, status: r.status, isHost: true, deckSize: MOVIES.length, members: members(done), filters: r.filters, pickedMovieId: r.picked };
};

const ok = (v: unknown = {}) => v;

export function devMock(method: string, path: string, body: any): unknown {
  const [pathname, qs = ''] = path.split('?');
  const seg = pathname.split('/').filter(Boolean);
  const key = `${method} /${seg.join('/')}`;
  const q = new URLSearchParams(qs);

  // ---- auth / me ----
  if (key === 'GET /auth/me') return { user: ME, preferences: { genres: GENRES, providers: PROVIDERS } };
  if (key === 'GET /me/stats') return { movieNights: 12, favoriteGenre: 'Sci-Fi', watchedCount: history.length + 18 };
  if (key === 'PATCH /me' || key === 'PUT /me/preferences' || key === 'POST /auth/change-password' || key === 'POST /auth/logout') return ok();
  if (key === 'DELETE /me') return ok();

  // ---- filme ----
  if (key === 'GET /movies/trending') return MOVIES.map(lite);
  if (key === 'GET /movies/search') {
    const t = (q.get('q') ?? '').toLowerCase();
    return MOVIES.filter((m) => m.title.toLowerCase().includes(t)).map(lite);
  }
  if (method === 'GET' && seg[0] === 'movies' && seg[1] && !['genres', 'providers'].includes(seg[1])) {
    const m = byId(seg[1]);
    return m ? { ...m, inWatchlist: watchlist.has(m.id) } : NO_MOCK;
  }

  // ---- watchlist / istoric ----
  if (key === 'GET /me/watchlist') return [...watchlist].map((id) => lite(byId(id)!));
  if (key === 'POST /me/watchlist') { watchlist.add(Number(body.movieId)); return ok(); }
  if (method === 'DELETE' && seg[0] === 'me' && seg[1] === 'watchlist') { watchlist.delete(Number(seg[2])); return ok(); }
  if (key === 'GET /me/history') return history;
  if (method === 'PATCH' && seg[0] === 'me' && seg[1] === 'history') {
    const h = history.find((x) => String(x.id) === seg[2]); if (h) h.myRating = body.myRating; return ok();
  }

  // ---- liste ----
  const listView = (l: Raw) => ({ id: l.id, name: l.name, category: l.category, itemsCount: l.items.length, items: l.items.map((i: number) => lite(byId(i)!)) });
  if (key === 'GET /lists') return lists.map(listView);
  if (key === 'POST /lists') { const l = { id: nextList++, name: body.name, category: body.category, items: [] as number[] }; lists.push(l); return listView(l); }
  if (seg[0] === 'lists' && seg[1]) {
    const i = lists.findIndex((l) => String(l.id) === seg[1]); const l = lists[i];
    if (!l) return NO_MOCK;
    if (method === 'GET' && seg.length === 2) return listView(l);
    if (method === 'PATCH' && seg.length === 2) { Object.assign(l, body); return ok(); }
    if (method === 'DELETE' && seg.length === 2) { lists.splice(i, 1); return ok(); }
    if (method === 'POST' && seg[2] === 'items') { if (!l.items.includes(Number(body.movieId))) l.items.push(Number(body.movieId)); return ok(); }
    if (method === 'DELETE' && seg[2] === 'items') { l.items = l.items.filter((x: number) => String(x) !== seg[3]); return ok(); }
  }

  // ---- camere ----
  if (key === 'GET /rooms') return Object.values(rooms).map((r) => ({ id: r.id, code: r.code, title: r.title, status: r.status, membersCount: 4 }));
  if (key === 'POST /rooms') {
    const id = `dev-${nextRoom++}`;
    const r: MockRoom = { id, code: 'M4X-81B', title: body.title ?? 'Movie night', status: 'LOBBY', votes: {}, picked: null,
      filters: { genres: (body.genreIds ?? []).map(String), providers: (body.providerIds ?? []).map(String), maxRuntime: body.maxRuntime ?? null, yearFrom: body.yearFrom ?? null, minRating: body.minRating ?? null } };
    rooms[id] = r; return roomView(r);
  }
  if (key === 'POST /rooms/join') return { room: roomView(rooms['dev-1']), member: { id: 'dev', nickname: body.nickname ?? 'Alex' }, guestToken: 'dev-guest' };
  if (seg[0] === 'rooms' && seg[1]) {
    const r = rooms[seg[1]]; if (!r) return NO_MOCK;
    const sub = seg[2];
    if (method === 'GET' && !sub) return roomView(r);
    if (method === 'DELETE' && sub === 'leave') return ok();
    if (method === 'POST' && sub === 'start') { r.status = 'VOTING'; return ok(); }
    if (method === 'GET' && sub === 'deck') return MOVIES.map((m) => ({ ...m, voted: !!r.votes[m.id] }));
    if (method === 'POST' && sub === 'votes') {
      r.votes[body.movieId] = body.choice;
      if (Object.keys(r.votes).length >= MOVIES.length) r.status = 'RESULTS';
      return ok();
    }
    if (method === 'GET' && sub === 'progress') {
      const done = Object.keys(r.votes).length >= MOVIES.length;
      return { total: 4, finishedCount: done ? 4 : 3, members: members(done).map((m) => ({ nickname: m.nickname, finished: m.finished })) };
    }
    if (method === 'POST' && sub === 'close-voting') { r.status = 'RESULTS'; return ok(); }
    if (method === 'GET' && sub === 'results') {
      if (r.status !== 'RESULTS' && r.status !== 'CLOSED') throw new Error('Rezultatele nu sunt gata încă.');
      const sorted = [...MOVIES].sort((a, b) => b.rating - a.rating);
      const item = (m: Raw, i: number) => ({ movie: lite(m), score: Math.max(40, 94 - i * 7), likes: 4 - (i > 3 ? 1 : 0), supers: i < 2 ? 2 : 0, dislikes: i > 3 ? 1 : 0 });
      return { top: sorted.slice(0, 5).map(item), compromises: sorted.slice(5, 8).map((m, i) => item(m, i + 5)), pickedMovieId: r.picked };
    }
    if (method === 'POST' && sub === 'pick') { r.picked = body.movieId; r.status = 'CLOSED'; return ok(); }
  }

  return NO_MOCK;
}
