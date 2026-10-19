import { API_URL } from '@/constants/config';
import { useAuth } from '@/store/auth';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean; // false = endpoint public
  signal?: AbortSignal;
};

let refreshing: Promise<string | null> | null = null;

async function refreshAccess(): Promise<string | null> {
  const { refresh, setSession, logout } = useAuth.getState();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    await setSession({ access: data.access, refresh: data.refresh ?? refresh });
    return data.access as string;
  } catch {
    await logout();
    return null;
  }
}

async function parseError(res: Response): Promise<ApiError> {
  let code = 'HTTP_ERROR';
  let message = `Eroare ${res.status}`;
  try {
    const data = await res.json();
    // format din README: { error: { code, message } }
    if (data?.error) {
      code = data.error.code ?? code;
      message = data.error.message ?? message;
    } else if (data?.detail) {
      message = String(data.detail);
    }
  } catch {}
  return new ApiError(res.status, code, message);
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, auth = true, signal } = opts;

  const run = async (token: string | null) => {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      throw new ApiError(0, 'NETWORK_ERROR', 'Nu mă pot conecta la server. Verifică rețeaua.');
    }
  };

  let res = await run(useAuth.getState().access);

  if (res.status === 401 && auth) {
    refreshing ??= refreshAccess().finally(() => (refreshing = null));
    const newToken = await refreshing;
    if (newToken) res = await run(newToken);
    else await useAuth.getState().logout();
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
