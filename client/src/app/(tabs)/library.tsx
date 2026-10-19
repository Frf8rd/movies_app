import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovieRow } from '@/components/movie/MovieRow';
import { Chip } from '@/components/ui/Chip';
import { EmptyState, ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useHistory, useLists, useWatchlist } from '@/hooks/queries';
import { createList, LIST_CATEGORIES } from '@/services/lists';
import { rateHistory, removeFromWatchlist } from '@/services/me';
import type { Id } from '@/types/models';

type Tab = 'saved' | 'history' | 'lists';
const TABS: { key: Tab; label: string }[] = [{ key: 'saved', label: 'Saved' }, { key: 'history', label: 'History' }, { key: 'lists', label: 'Lists' }];
const goMovie = (id: Id) => router.push(`/movie/${id}` as Href);

export default function LibraryScreen() {
  const [tab, setTab] = useState<Tab>('saved');
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Text style={styles.title}>Library</Text>
      <View style={styles.seg}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={[styles.segItem, tab === t.key && styles.segOn]}>
            <Text style={[styles.segText, tab === t.key && { color: '#1A1030' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {tab === 'saved' && <SavedTab />}
      {tab === 'history' && <HistoryTab />}
      {tab === 'lists' && <ListsTab />}
    </SafeAreaView>
  );
}

function SavedTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useWatchlist();

  const remove = async (id: Id) => {
    try { await removeFromWatchlist(id); } finally { qc.invalidateQueries({ queryKey: ['watchlist'] }); }
  };

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState icon="bookmark-outline" message="Nu ai filme salvate. Apasă pe semnul de carte dintr-un film ca să-l salvezi." />;
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {data.map((m) => (
        <MovieRow key={String(m.id)} movie={m} onPress={() => goMovie(m.id)}
          right={<Pressable onPress={() => remove(m.id)} hitSlop={10}><Ionicons name="bookmark" size={22} color={Colors.primary} /></Pressable>} />
      ))}
    </ScrollView>
  );
}

function HistoryTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useHistory();

  const rate = async (id: Id, stars: number) => {
    try { await rateHistory(id, stars); } finally { qc.invalidateQueries({ queryKey: ['history'] }); }
  };

  if (isLoading) return <Loading />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={() => refetch()} />;
  if (!data?.length) return <EmptyState icon="time-outline" message="Filmele alese în camere apar aici." />;
  return (
    <ScrollView contentContainerStyle={styles.list}>
      {data.map((h) => (
        <MovieRow key={String(h.id)} movie={h.movie} onPress={() => goMovie(h.movie.id)}
          below={
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => rate(h.id, n)} hitSlop={4}>
                  <Ionicons name={(h.myRating ?? 0) >= n ? 'star' : 'star-outline'} size={18} color={Colors.star} />
                </Pressable>
              ))}
            </View>
          } />
      ))}
    </ScrollView>
  );
}

function ListsTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useLists();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(LIST_CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onCreate = async () => {
    if (name.trim().length < 1) return;
    setSaving(true);
    setErr(null);
    try {
      const l = await createList(name.trim(), category);
      qc.invalidateQueries({ queryKey: ['lists'] });
      setOpen(false);
      setName('');
      router.push(`/lists/${l.id}` as Href);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {isLoading ? <Loading /> : isError ? <ErrorState message={(error as Error).message} onRetry={() => refetch()} /> : (
        <ScrollView contentContainerStyle={styles.list}>
          {!data?.length && <EmptyState icon="albums-outline" message="Nu ai nicio listă — creează prima (Prieteni, Familie, Cuplu)." />}
          {data?.map((l) => (
            <Pressable key={String(l.id)} onPress={() => router.push(`/lists/${l.id}` as Href)} style={styles.listCard}>
              <View style={styles.listIcon}><Ionicons name="albums" size={22} color={Colors.primary} /></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listName} numberOfLines={1}>{l.name}</Text>
                <Text style={styles.listMeta}>{l.category} · {l.itemsCount} films</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <Pressable onPress={() => setOpen(true)} style={styles.fab}><Ionicons name="add" size={28} color="#1A1030" /></Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New list</Text>
            <TextInput value={name} onChangeText={setName} placeholder="List name" placeholderTextColor={Colors.textMuted} style={styles.input} maxLength={40} />
            <View style={styles.cats}>
              {LIST_CATEGORIES.map((c) => <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />)}
            </View>
            {err && <Text style={styles.error}>{err}</Text>}
            <Pressable onPress={onCreate} disabled={saving || !name.trim()} style={[styles.btn, (saving || !name.trim()) && { opacity: 0.5 }]}>
              {saving ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Create list</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  seg: { flexDirection: 'row', marginHorizontal: 20, padding: 4, borderRadius: Radius.pill, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border },
  segItem: { flex: 1, height: 34, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  segOn: { backgroundColor: Colors.primary },
  segText: { color: Colors.textMuted, fontWeight: '800', fontSize: 13 },
  list: { padding: 20, gap: 12, paddingBottom: 90, flexGrow: 1 },
  stars: { flexDirection: 'row', gap: 4, marginTop: 2 },
  listCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  listIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,138,31,0.14)', alignItems: 'center', justifyContent: 'center' },
  listName: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  listMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  fab: { position: 'absolute', right: 20, bottom: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { backgroundColor: Colors.card, borderTopLeftRadius: Radius.lg, borderTopRightRadius: Radius.lg, padding: 20, gap: 14, paddingBottom: 30 },
  sheetTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  input: { height: 50, borderRadius: Radius.md, backgroundColor: Colors.bgElevated, borderWidth: 1, borderColor: Colors.border, color: Colors.text, paddingHorizontal: 14, fontSize: 15 },
  cats: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  error: { color: Colors.danger, fontSize: 13 },
  btn: { height: 50, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#1A1030', fontWeight: '800', fontSize: 16 },
});
