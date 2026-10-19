// Serverul Django poate întoarce camelCase sau snake_case și liste simple sau paginate DRF
// ({ results: [...] }). Normalizăm aici, într-un singur loc, ca ecranele să rămână curate.
import { TMDB_IMAGE_BASE } from '@/constants/config';
import type { Movie, Room, RoomStatus, User } from '@/types/models';

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
