export type User = {
  id: number | string;
  name: string;
  email: string;
  avatarUrl: string | null;
};

export type Movie = {
  id: number | string;
  title: string;
  year: number | null;
  runtime: number | null;
  rating: number | null;
  posterUrl: string | null;
};

export type RoomStatus = 'LOBBY' | 'VOTING' | 'RESULTS' | 'CLOSED';

export type Room = {
  id: number | string;
  code: string;
  title: string;
  status: RoomStatus;
  membersCount: number;
};

export type Id = number | string;

export type Genre = { id: Id; name: string };

export type Provider = { id: Id; name: string; logoUrl: string | null };

export type RoomFilters = {
  title: string;
  genreIds: Id[];
  providerIds: Id[];
  maxRuntime: number | null;
  yearFrom: number | null;
  minRating: number | null;
};

export type Member = { id: Id; name: string; avatarUrl: string | null; isHost: boolean; isMe: boolean; finished: boolean };

export type RoomDetail = Room & {
  isHost: boolean;
  members: Member[];
  deckSize: number;
  pickedMovieId: Id | null;
  filters: { genres: string[]; providers: string[]; maxRuntime: number | null; yearFrom: number | null; minRating: number | null };
};

export type MovieDetail = Movie & {
  overview: string;
  genres: string[];
  trailerUrl: string | null;
  providers: Provider[];
  inWatchlist: boolean;
  /** doar în deck: am votat deja filmul */
  voted: boolean;
};

export type VoteChoice = 'LIKE' | 'DISLIKE' | 'VETO';

export type Progress = { total: number; finishedCount: number; members: { nickname: string; finished: boolean }[] };

export type ResultItem = { movie: Movie; score: number; likes: number; supers: number; dislikes: number };
export type Results = { top: ResultItem[]; compromises: ResultItem[]; pickedMovieId: Id | null };

export type HistoryEntry = { id: Id; movie: Movie; watchedAt: string | null; myRating: number | null };

export type MovieList = { id: Id; name: string; category: string; itemsCount: number; movies: Movie[] };

export type Stats = { movieNights: number; favoriteGenre: string | null; watchedCount: number };

export type Profile = { user: User; genres: Genre[]; providers: Provider[] };
