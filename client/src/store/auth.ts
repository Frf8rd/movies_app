import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { User } from '@/types/models';

const ACCESS_KEY = 'rm_access';
const REFRESH_KEY = 'rm_refresh';
const GUEST_KEY = 'rm_guest';
export const DEV_TOKEN = 'dev-skip-token';

type AuthState = {
  hydrated: boolean;
  access: string | null;
  /** true = sesiune de invitat (intră doar cu cod + poreclă, fără cont) */
  isGuest: boolean;
  refresh: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  setSession: (s: { access: string; refresh?: string | null; user?: User | null }) => Promise<void>;
  setGuestSession: (s: { token: string; user?: User | null }) => Promise<void>;
  setUser: (user: User | null) => void;
  /** DEV ONLY: sesiune falsă, fără backend și fără salvare în SecureStore. */
  devSkip: () => void;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  hydrated: false,
  access: null,
  isGuest: false,
  refresh: null,
  user: null,

  hydrate: async () => {
    try {
      const [access, refresh, guest] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
        SecureStore.getItemAsync(GUEST_KEY),
      ]);
      set({ access, refresh, isGuest: guest === '1', hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setSession: async ({ access, refresh = null, user = null }) => {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    await SecureStore.deleteItemAsync(GUEST_KEY).catch(() => {});
    set({ access, isGuest: false, refresh: refresh ?? get().refresh, user: user ?? get().user });
  },

  setGuestSession: async ({ token, user = null }) => {
    await SecureStore.setItemAsync(ACCESS_KEY, token);
    await SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {});
    await SecureStore.setItemAsync(GUEST_KEY, '1');
    set({ access: token, refresh: null, isGuest: true, user });
  },

  setUser: (user) => set({ user }),

  devSkip: () =>
    set({
      access: DEV_TOKEN,
      isGuest: false,
      refresh: null,
      user: { id: 'dev', name: 'Alex', email: 'dev@reelmatch.local', avatarUrl: null },
    }),

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(GUEST_KEY).catch(() => {}),
    ]);
    set({ access: null, refresh: null, isGuest: false, user: null });
  },
}));
