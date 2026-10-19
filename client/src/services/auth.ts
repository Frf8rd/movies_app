import { api } from '@/services/api';
import { normalizeUser } from '@/services/normalize';
import { useAuth } from '@/store/auth';

export async function login(email: string, password: string) {
  const data = await api<any>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
  await useAuth.getState().setSession({
    access: data.access,
    refresh: data.refresh,
    user: data.user ? normalizeUser(data.user) : null,
  });
}

export async function fetchMe() {
  const data = await api<any>('/auth/me');
  return normalizeUser(data.user ?? data);
}
