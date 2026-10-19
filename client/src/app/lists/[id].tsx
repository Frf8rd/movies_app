import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovieRow } from '@/components/movie/MovieRow';
import { EmptyState, ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useList } from '@/hooks/queries';
import { addListItem, deleteList, removeListItem, searchMovies } from '@/services/lists';
import { createRoom } from '@/services/rooms';
import type { Id, Movie } from '@/types/models';

export default function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: list, isLoading, isError, error, refetch } = useList(id);
  const [searchOpen, setSearchOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['lists'] });
  };

  const remove = async (movieId: Id) => {
    try { await removeListItem(id, movieId); } finally { refresh(); }
  };

  const onDelete = () =>
    Alert.alert('Delete list?', `"${list?.name}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteList(id).catch(() => {}); refresh(); router.back(); } },
    ]);

  // README: „Începe o cameră cu această listă" -> POST /rooms cu sourceListId
  const startRoom = async () => {
    if (!list) return;
    setCreating(true);
    try {
      const room = await createRoom({ title: list.name, genreIds: [], providerIds: [], maxRuntime: null, yearFrom: null, minRating: null }, 30, list.id);
      qc.invalidateQueries({ queryKey: ['rooms'] });
      router.replace({ pathname: '/room/[id]/lobby', params: { id: String(room.id) } });
    } catch (e) {
      Alert.alert('Could not create room', (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title} numberOfLines={1}>{list?.name ?? 'List'}</Text>
        <Pressable onPress={onDelete} hitSlop={12}><Ionicons name="trash-outline" size={22} color={Colors.danger} /></Pressable>
      </View>

      {isLoading ? <Loading /> : isError || !list ? <ErrorState message={(error as Error)?.message ?? 'Lista nu există.'} onRetry={() => refetch()} /> : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.meta}>{list.category} · {list.itemsCount} films</Text>
            {list.movies.length === 0 && <EmptyState icon="film-outline" message="Lista e goală. Adaugă primul film." />}
            {list.movies.map((m) => (
              <MovieRow key={String(m.id)} movie={m} onPress={() => router.push(`/movie/${m.id}` as Href)}
                right={<Pressable onPress={() => remove(m.id)} hitSlop={10}><Ionicons name="close-circle-outline" size={24} color={Colors.textMuted} /></Pressable>} />
            ))}
            <Pressable onPress={() => setSearchOpen(true)} style={styles.add}>
              <Ionicons name="add" size={20} color={Colors.primary} /><Text style={styles.addText}>Add movie</Text>
            </Pressable>
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.footer}>
            <Pressable onPress={startRoom} disabled={creating || list.movies.length < 1} style={[styles.btn, (creating || list.movies.length < 1) && { opacity: 0.5 }]}>
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start a room with this list</Text>}
            </Pressable>
          </SafeAreaView>
        </>
      )}

      <SearchModal visible={searchOpen} onClose={() => setSearchOpen(false)} existing={list?.movies ?? []} onAdd={async (m) => { await addListItem(id, m.id); refresh(); }} />
    </SafeAreaView>
  );
}

function SearchModal({ visible, onClose, existing, onAdd }: { visible: boolean; onClose: () => void; existing: Movie[]; onAdd: (m: Movie) => Promise<void> }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // căutare cu debounce
  useEffect(() => {
    if (q.trim().length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setLoading(true); setErr(null);
      try { setResults(await searchMovies(q.trim())); } catch (e) { setErr((e as Error).message); } finally { setLoading(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const has = (m: Movie) => existing.some((e) => String(e.id) === String(m.id));

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={styles.header}>
            <Text style={styles.title}>Add movie</Text>
            <Pressable onPress={onClose} hitSlop={12}><Text style={styles.close}>Done</Text></Pressable>
          </View>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color={Colors.textMuted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search movies" placeholderTextColor={Colors.textMuted} style={styles.searchInput} autoFocus />
          </View>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {loading && <ActivityIndicator color={Colors.primary} />}
            {err && <Text style={styles.error}>{err}</Text>}
            {results.map((m) => (
              <MovieRow key={String(m.id)} movie={m}
                right={has(m)
                  ? <Ionicons name="checkmark-circle" size={24} color="#22D3C5" />
                  : <Pressable onPress={() => onAdd(m)} hitSlop={10}><Ionicons name="add-circle" size={28} color={Colors.primary} /></Pressable>} />
            ))}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 20, gap: 12 },
  title: { flex: 1, color: Colors.text, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  close: { color: Colors.primary, fontWeight: '800', fontSize: 15 },
  content: { padding: 20, gap: 12, paddingBottom: 30 },
  meta: { color: Colors.textMuted, fontSize: 13 },
  add: { flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', height: 48, borderRadius: Radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.primary },
  addText: { color: Colors.primary, fontWeight: '800' },
  footer: { paddingHorizontal: 20, paddingBottom: 10 },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.purpleLight, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, height: 48, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  searchInput: { flex: 1, color: Colors.text, fontSize: 15 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
});
