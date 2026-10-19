// Serverul Django poate întoarce camelCase sau snake_case și liste simple sau paginate DRF
// ({ results: [...] }). Normalizăm aici, într-un singur loc, ca ecranele să rămână curate.
import { TMDB_IMAGE_BASE } from '@/constants/config';
import type { Genre, HistoryEntry, Member, Movie, MovieDetail, MovieList, Profile, Provider, ResultItem, Results, Room, RoomDetail, RoomStatus, Stats, User } from '@/types/models';

type Raw = Record<string, any>;

export function toList<T = Raw>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as Raw).results)) {
    return (data as Raw).results as T[];
  }
  return [];
}

const pick = (o: Raw, ...keys: string[]) => {
  for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k];
  return null;
};

function posterUrl(o: Raw): string | null {
  const v = pick(o, 'posterUrl', 'poster_url', 'posterPath', 'poster_path', 'poster');
  if (!v) return null;
  const s = String(v);
  if (/^https?:\/\//.test(s)) return s;
  return `${TMDB_IMAGE_BASE}${s.startsWith('/') ? s : `/${s}`}`;
}

export function normalizeMovie(o: Raw): Movie {
  const rating = pick(o, 'rating', 'voteAverage', 'vote_average');
  const runtime = pick(o, 'runtime');
  const year = pick(o, 'year');
  return {
    id: o.id,
    title: String(o.title ?? ''),
    year: year !== null ? Number(year) : null,
    runtime: runtime !== null ? Number(runtime) : null,
    rating: rating !== null ? Number(rating) : null,
    posterUrl: posterUrl(o),
  };
}

export function normalizeRoom(o: Raw): Room {
  const members = pick(o, 'membersCount', 'members_count', 'participantsCount');
  const list = Array.isArray(o.members) ? o.members.length : 0;
  return {
    id: o.id,
    code: String(o.code ?? ''),
    title: String(o.title ?? ''),
    status: (o.status ?? 'LOBBY') as RoomStatus,
    membersCount: members !== null ? Number(members) : list,
  };
}

export function normalizeUser(o: Raw): User {
  return {
    id: o.id,
    name: String(pick(o, 'name', 'first_name', 'username') ?? ''),
    email: String(o.email ?? ''),
    avatarUrl: pick(o, 'avatarUrl', 'avatar_url'),
  };
}

export function normalizeGenre(o: Raw): Genre {
  return { id: o.id, name: String(o.name ?? '') };
}

export function normalizeProvider(o: Raw): Provider {
  const v = pick(o, 'logoUrl', 'logo_url', 'logoPath', 'logo_path', 'logo');
  const s = v ? String(v) : null;
  const logoUrl = s ? (/^https?:\/\//.test(s) ? s : `${TMDB_IMAGE_BASE}${s.startsWith('/') ? s : `/${s}`}`) : null;
  return { id: o.id, name: String(o.name ?? ''), logoUrl };
}

const names = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : String((x as Raw)?.name ?? ''))).filter(Boolean) : [];
const num = (v: unknown): number | null => (v === null || v === undefined || v === '' ? null : Number(v));

const toProvider = (x: unknown): Provider =>
  typeof x === 'string' ? { id: x, name: x, logoUrl: null } : normalizeProvider(x as Raw);

export function normalizeMovieDetail(o: Raw): MovieDetail {
  return {
    ...normalizeMovie(o),
    overview: String(pick(o, 'overview', 'description') ?? ''),
    genres: names(o.genres),
    trailerUrl: pick(o, 'trailerUrl', 'trailer_url', 'trailer'),
    providers: Array.isArray(o.providers) ? o.providers.map(toProvider) : [],
    inWatchlist: Boolean(pick(o, 'inWatchlist', 'in_watchlist')),
    voted: Boolean(pick(o, 'voted', 'myVote', 'my_vote')),
  };
}

export function normalizeMember(o: Raw): Member {
  return {
    id: o.id,
    name: String(pick(o, 'nickname', 'name', 'username') ?? ''),
    avatarUrl: pick(o, 'avatarUrl', 'avatar_url'),
    isHost: Boolean(pick(o, 'isHost', 'is_host')),
    isMe: Boolean(pick(o, 'isMe', 'is_me')),
    finished: Boolean(pick(o, 'finished', 'isFinished', 'is_finished')),
  };
}

export function normalizeRoomDetail(o: Raw): RoomDetail {
  const f: Raw = o.filters ?? o;
  const members = Array.isArray(o.members) ? o.members.map(normalizeMember) : [];
  const base = normalizeRoom(o);
  return {
    ...base,
    membersCount: members.length || base.membersCount,
    isHost: Boolean(pick(o, 'isHost', 'is_host')) || members.some((m) => m.isHost && m.isMe),
    members,
    deckSize: Number(pick(o, 'deckSize', 'deck_size') ?? 0),
    pickedMovieId: pick(o, 'pickedMovieId', 'picked_movie_id', 'pickedMovie'),
    filters: {
      genres: names(f.genres ?? f.genreNames ?? f.genre_names),
      providers: names(f.providers ?? f.providerNames ?? f.provider_names),
      maxRuntime: num(pick(f, 'maxRuntime', 'max_runtime')),
      yearFrom: num(pick(f, 'yearFrom', 'year_from')),
      minRating: num(pick(f, 'minRating', 'min_rating')),
    },
  };
}

export function normalizeResultItem(o: Raw): ResultItem {
  return {
    movie: normalizeMovie(o.movie ?? o),
    score: Number(o.score ?? 0),
    likes: Number(o.likes ?? 0),
    supers: Number(o.supers ?? 0),
    dislikes: Number(o.dislikes ?? 0),
  };
}

export function normalizeResults(o: Raw): Results {
  return {
    top: toList(o.top ?? o.unanimous ?? o.accepted ?? o.results).map(normalizeResultItem),
    compromises: toList(o.compromises ?? o.compromise).map(normalizeResultItem),
    pickedMovieId: pick(o, 'pickedMovieId', 'picked_movie_id'),
  };
}

export function normalizeHistory(o: Raw): HistoryEntry {
  return {
    id: o.id,
    movie: normalizeMovie(o.movie ?? o),
    watchedAt: pick(o, 'watchedAt', 'watched_at'),
    myRating: num(pick(o, 'myRating', 'my_rating')),
  };
}

export function normalizeList(o: Raw): MovieList {
  const items = toList<Raw>(o.items ?? o.movies);
  return {
    id: o.id,
    name: String(o.name ?? ''),
    category: String(o.category ?? ''),
    itemsCount: Number(pick(o, 'itemsCount', 'items_count') ?? items.length),
    movies: items.map((i) => normalizeMovie(i.movie ?? i)),
  };
}

export function normalizeStats(o: Raw): Stats {
  const fav = pick(o, 'favoriteGenre', 'favorite_genre');
  return {
    movieNights: Number(pick(o, 'movieNights', 'movie_nights', 'roomsCount') ?? 0),
    favoriteGenre: fav ? (typeof fav === 'string' ? fav : String((fav as Raw).name ?? '')) : null,
    watchedCount: Number(pick(o, 'watchedCount', 'watched_count', 'moviesWatched') ?? 0),
  };
}

export function normalizeProfile(data: Raw): Profile {
  const u: Raw = data.user ?? data;
  const pr: Raw = data.preferences ?? u.preferences ?? {};
  const genres = Array.isArray(pr.genres)
    ? pr.genres.map((g: Raw) => normalizeGenre(typeof g === 'object' ? g : { id: g, name: String(g) }))
    : (pr.genreIds ?? pr.genre_ids ?? []).map((id: Raw) => ({ id, name: String(id) }));
  const providers = Array.isArray(pr.providers)
    ? pr.providers.map(toProvider)
    : (pr.providerIds ?? pr.provider_ids ?? []).map((id: Raw) => ({ id, name: String(id), logoUrl: null }));
  return { user: normalizeUser(u), genres, providers };
}
