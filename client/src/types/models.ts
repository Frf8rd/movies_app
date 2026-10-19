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
