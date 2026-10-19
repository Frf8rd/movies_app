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

// POST /auth/register  { name, email, password } -> { user, access, refresh }
export async function register(name: string, email: string, password: string) {
  const data = await api<any>('/auth/register', { method: 'POST', body: { name, email, password }, auth: false });
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

// POST /auth/logout (invalidează refresh token-ul) apoi golește sesiunea locală
export async function logoutRemote() {
  try {
    const { refresh } = useAuth.getState();
    if (refresh) await api('/auth/logout', { method: 'POST', body: { refresh } });
  } catch {}
  await useAuth.getState().logout();
}
