import { router } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionCard } from '@/components/home/ActionCard';
import { ActiveRoomCard } from '@/components/home/ActiveRoomCard';
import { TrendingSection } from '@/components/home/TrendingSection';
import { Logo } from '@/components/ui/Logo';
import { Colors } from '@/constants/theme';
import { useActiveRooms, useMe, useTrending } from '@/hooks/queries';

export default function HomeScreen() {
  const me = useMe(); // sincronizează utilizatorul în store (GET /auth/me)
  const rooms = useActiveRooms();
  const trending = useTrending();
  const [refreshing, setRefreshing] = useState(false);

  const activeRoom = rooms.data?.[0];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([me.refetch(), rooms.refetch(), trending.refetch()]);
    setRefreshing(false);
  }, [me, rooms, trending]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}>
        <View style={styles.header}>
          <Logo />
        </View>

        {activeRoom && (
          <ActiveRoomCard
            room={activeRoom}
            onPress={() => router.push(activeRoom.status === 'VOTING' ? `/room/${activeRoom.id}/vote` : `/room/${activeRoom.id}/lobby`)}
          />
        )}

        <ActionCard
          icon="add-circle-outline"
          title="Create a room"
          subtitle="Start a new movie night with your friends."
          buttonLabel="Create room"
          gradient={[Colors.red, '#F0214F']}
          iconBg="rgba(255,138,31,0.95)"
          buttonBg={Colors.primary}
          buttonColor="#2A0F00"
          onPress={() => router.push('/room/create')}
        />

        <ActionCard
          icon="grid-outline"
          title="Join with code"
          subtitle="Already have a code? Join an existing room."
          buttonLabel="Join with code"
          gradient={['#3B1FA8', '#4C2BC9']}
          iconBg={Colors.purpleLight}
          buttonBg={Colors.purpleLight}
          buttonColor="#fff"
          onPress={() => router.push('/room/join')}
        />

        <TrendingSection />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 16, gap: 18, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
