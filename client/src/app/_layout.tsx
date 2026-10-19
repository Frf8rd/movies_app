import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useAuth } from '@/store/auth';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }),
  );
  const hydrated = useAuth((s) => s.hydrated);
  const isAuthed = useAuth((s) => !!s.access);
  const isGuest = useAuth((s) => s.isGuest);
  const isMember = isAuthed && !isGuest; // utilizator cu cont
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated) SplashScreen.hideAsync();
  }, [hydrated]);

  // la logout, golim cache-ul ca să nu rămână datele utilizatorului anterior
  useEffect(() => {
    if (hydrated && !isAuthed) queryClient.clear();
  }, [hydrated, isAuthed, queryClient]);

  if (!hydrated) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.bg }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.bg } }}>
            {/* doar utilizatori cu cont */}
            <Stack.Protected guard={isMember}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="room/create" />
              <Stack.Screen name="room/join" />
              <Stack.Screen name="onboarding" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="lists/[id]" />
              <Stack.Screen name="movies" />
            </Stack.Protected>
            {/* cont SAU invitat (README: invitații au acces doar la room/[id]/* și movie/[id]) */}
            <Stack.Protected guard={isAuthed}>
              <Stack.Screen name="movie/[id]" />
              <Stack.Screen name="room/[id]/lobby" />
              <Stack.Screen name="room/[id]/vote" />
              <Stack.Screen name="room/[id]/results" />
            </Stack.Protected>
            <Stack.Protected guard={!isAuthed}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
