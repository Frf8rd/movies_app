import { api } from '@/services/api';
import { normalizeRoom, toList } from '@/services/normalize';
import type { Room } from '@/types/models';

// GET /rooms?status=active
export async function getActiveRooms(): Promise<Room[]> {
  const data = await api<unknown>('/rooms?status=active');
  return toList(data).map(normalizeRoom);
}
