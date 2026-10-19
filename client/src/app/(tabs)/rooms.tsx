import { Href, router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveRoomCard } from '@/components/home/ActiveRoomCard';
import { EmptyState, ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useRooms } from '@/hooks/queries';
import type { Room } from '@/types/models';

const open = (r: Room) => {
  const page = r.status === 'VOTING' ? 'vote' : r.status === 'LOBBY' ? 'lobby' : 'results';
  router.push(`/room/${r.id}/${page}` as Href);
};

export default function RoomsScreen() {
  const [tab, setTab] = useState<'active' | 'ended'>('active');
  const { data, isLoading, isError, error, refetch, isRefetching } = useRooms();

  const list = (data ?? []).filter((r) => (tab === 'active' ? r.status === 'LOBBY' || r.status === 'VOTING' : r.status === 'RESULTS' || r.status === 'CLOSED'));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My rooms</Text>
        <View style={styles.actions}>
          <Pressable onPress={() => router.push('/room/join')} style={[styles.btn, styles.btnJoin]}><Text style={styles.btnJoinText}>Join</Text></Pressable>
          <Pressable onPress={() => router.push('/room/create')} style={[styles.btn, styles.btnNew]}><Text style={styles.btnNewText}>+ New</Text></Pressable>
        </View>
      </View>

      <View style={styles.seg}>
        {(['active', 'ended'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.segItem, tab === t && styles.segOn]}>
            <Text style={[styles.segText, tab === t && { color: '#1A1030' }]}>{t === 'active' ? 'Active' : 'Finished'}</Text>
          </Pressable>
        ))}
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(r) => String(r.id)}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={<EmptyState icon="people-outline" message={tab === 'active' ? 'Nu ai nicio cameră încă — creează prima.' : 'Nicio cameră încheiată încă.'} />}
          renderItem={({ item }) => <ActiveRoomCard room={item} onPress={() => open(item)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { height: 36, paddingHorizontal: 14, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  btnJoin: { borderWidth: 1.5, borderColor: Colors.purpleLight },
  btnJoinText: { color: Colors.purpleLight, fontWeight: '800', fontSize: 13 },
  btnNew: { backgroundColor: Colors.primary },
  btnNewText: { color: '#1A1030', fontWeight: '800', fontSize: 13 },
  seg: { flexDirection: 'row', marginHorizontal: 20, padding: 4, borderRadius: Radius.pill, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  segItem: { flex: 1, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: Colors.primary },
  segText: { color: Colors.textMuted, fontWeight: '800', fontSize: 13 },
  list: { padding: 20, gap: 12, flexGrow: 1 },
});
