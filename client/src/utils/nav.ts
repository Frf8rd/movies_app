import { Href, router } from 'expo-router';

import { useAuth } from '@/store/auth';

// După ce ieși dintr-o cameră: membrii merg la Home, invitații (fără cont) ies din sesiune.
export function leaveToHome() {
  const { isGuest, logout } = useAuth.getState();
  if (isGuest) logout();
  else router.replace('/(tabs)' as Href);
}
