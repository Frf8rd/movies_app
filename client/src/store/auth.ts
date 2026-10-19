import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { User } from '@/types/models';

const ACCESS_KEY = 'rm_access';
const REFRESH_KEY = 'rm_refresh';

type AuthState = {
  hydrated: boolean;
  access: string | null;
  refresh: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  setSession: (s: { access: string; refresh?: string | null; user?: User | null }) => Promise<void>;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  hydrated: false,
  access: null,
  refresh: null,
  user: null,

  hydrate: async () => {
    try {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_KEY),
        SecureStore.getItemAsync(REFRESH_KEY),
      ]);
      set({ access, refresh, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setSession: async ({ access, refresh = null, user = null }) => {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    if (refresh) await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    set({ access, refresh: refresh ?? get().refresh, user: user ?? get().user });
  },

  setUser: (user) => set({ user }),

  logout: async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY).catch(() => {}),
      SecureStore.deleteItemAsync(REFRESH_KEY).catch(() => {}),
    ]);
    set({ access: null, refresh: null, user: null });
  },
}));
