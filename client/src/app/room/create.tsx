import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PickerOption, PickerSheet } from '@/components/ui/PickerSheet';
import { Colors, Radius } from '@/constants/theme';
import { useGenres, useProviders } from '@/hooks/queries';
import { createRoom } from '@/services/rooms';
import type { Id } from '@/types/models';

type Sheet = 'genre' | 'runtime' | 'platforms' | 'year' | 'rating' | null;

const thisYear = new Date().getFullYear();
const RUNTIME: PickerOption[] = [
  { value: null, label: 'Any length' },
  ...[90, 120, 150, 180].map((m) => ({ value: m, label: `Up to ${m} min` })),
];
const YEAR: PickerOption[] = [
  { value: null, label: 'Any year' },
  ...[2020, 2010, 2000, 1990].map((y) => ({ value: y, label: `${y} – ${thisYear}` })),
];
const RATING: PickerOption[] = [
  { value: null, label: 'Any rating' },
  ...[5, 6, 7, 8].map((r) => ({ value: r, label: `${r}.0 and up` })),
];

export default function CreateRoomScreen() {
  const qc = useQueryClient();
  const genres = useGenres();
  const providers = useProviders();

  const [title, setTitle] = useState('');
  const [genreIds, setGenreIds] = useState<Id[]>([]);
  const [providerIds, setProviderIds] = useState<Id[]>([]);
  const [maxRuntime, setMaxRuntime] = useState<number | null>(null);
  const [yearFrom, setYearFrom] = useState<number | null>(null);
  const [minRating, setMinRating] = useState<number | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const names = (ids: Id[], list?: { id: Id; name: string }[], fallback = '') =>
    ids.length === 0 ? fallback : (list ?? []).filter((x) => ids.includes(x.id)).map((x) => x.name).join(', ') || `${ids.length} selected`;

  const onCreate = async () => {
    setError(null);
    setLoading(true);
    try {
      const room = await createRoom({
        title: title.trim() || 'Movie night',
        genreIds,
        providerIds,
        maxRuntime,
        yearFrom,
        minRating,
      });
      qc.invalidateQueries({ queryKey: ['rooms'] });
      // lobby-ul afișează codul camerei + butonul de trimitere
      router.replace({ pathname: '/room/[id]/lobby', params: { id: String(room.id) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const Row = ({ icon, label, value, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; onPress: () => void }) => (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={22} color={Colors.textMuted} />
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );

  const catalogError = genres.isError || providers.isError ? 'Nu s-au putut încărca opțiunile. Verifică conexiunea.' : undefined;
  const genreOptions: PickerOption[] = (genres.data ?? []).map((g) => ({ value: g.id, label: g.name }));
  const providerOptions: PickerOption[] = (providers.data ?? []).map((p) => ({ value: p.id, label: p.name }));

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0F6B7A', Colors.bg]} style={styles.glow} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Create a room</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <Ionicons name="film-outline" size={22} color={Colors.textMuted} />
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Room title</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Movie night"
                placeholderTextColor={Colors.textMuted}
                maxLength={40}
                style={styles.titleInput}
              />
            </View>
          </View>

          <Row icon="pricetags-outline" label="Genre" value={names(genreIds, genres.data, 'Any genre')} onPress={() => setSheet('genre')} />
          <Row icon="time-outline" label="Max runtime" value={maxRuntime ? `Up to ${maxRuntime} min` : 'Any length'} onPress={() => setSheet('runtime')} />
          <Row icon="tv-outline" label="Platforms" value={names(providerIds, providers.data, 'All platforms')} onPress={() => setSheet('platforms')} />
          <Row icon="calendar-outline" label="Year" value={yearFrom ? `${yearFrom} – ${thisYear}` : 'Any year'} onPress={() => setSheet('year')} />
          <Row icon="star-outline" label="Minimum rating" value={minRating ? `${minRating}.0 and up` : 'Any rating'} onPress={() => setSheet('rating')} />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={onCreate} disabled={loading} style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.6 }]}>
            {loading ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Create room</Text>}
          </Pressable>
          <Text style={styles.footer}>Your friends will receive a 6-character{'\n'}code to join the room.</Text>
        </ScrollView>
      </SafeAreaView>

      <PickerSheet visible={sheet === 'genre'} title="Genre" multi options={genreOptions} selected={genreIds} emptyMessage={catalogError}
        onChange={(v) => setGenreIds(v as Id[])} onClose={() => setSheet(null)} />
      <PickerSheet visible={sheet === 'platforms'} title="Platforms" multi options={providerOptions} selected={providerIds} emptyMessage={catalogError}
        onChange={(v) => setProviderIds(v as Id[])} onClose={() => setSheet(null)} />
      <PickerSheet visible={sheet === 'runtime'} title="Max runtime" options={RUNTIME} selected={[maxRuntime]}
        onChange={(v) => setMaxRuntime(v[0] as number | null)} onClose={() => setSheet(null)} />
      <PickerSheet visible={sheet === 'year'} title="Year" options={YEAR} selected={[yearFrom]}
        onChange={(v) => setYearFrom(v[0] as number | null)} onClose={() => setSheet(null)} />
      <PickerSheet visible={sheet === 'rating'} title="Minimum rating" options={RATING} selected={[minRating]}
        onChange={(v) => setMinRating(v[0] as number | null)} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 140 },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56, paddingHorizontal: 20 },
  headerTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  content: { padding: 20, gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 62,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowText: { flex: 1 },
  rowLabel: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  rowValue: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  titleInput: { color: Colors.textMuted, fontSize: 12, padding: 0, marginTop: 2 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
  footer: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 4 },
});
