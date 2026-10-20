import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Poster } from '@/components/movie/Poster';
import { Chip } from '@/components/ui/Chip';
import { ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useMovie, useWatchlist } from '@/hooks/queries';
import { ApiError } from '@/services/api';
import { addToWatchlist, removeFromWatchlist } from '@/services/me';
import { useAuth } from '@/store/auth';

export default function MovieDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const isGuest = useAuth((s) => s.isGuest);
  const { data: m, isLoading, isError, error, refetch } = useMovie(id);
  const watchlist = useWatchlist(!isGuest); // detaliile filmului nu spun dacă e în watchlist
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<boolean | null>(null); // optimistic

  const inList = saved ?? m?.inWatchlist ?? watchlist.data?.some((w) => String(w.id) === String(m?.id)) ?? false;

  const toggle = async () => {
    if (!m || busy) return;
    const next = !inList;
    setSaved(next);
    setBusy(true);
    try {
      await (next ? addToWatchlist(m.id) : removeFromWatchlist(m.id));
      qc.invalidateQueries({ queryKey: ['watchlist'] });
    } catch (e) {
      // 409 = deja în watchlist, 404 = deja scos: starea dorită e oricum cea corectă
      if (!(e instanceof ApiError && (e.status === 409 || e.status === 404))) setSaved(!next); // altfel revert
    } finally {
      setBusy(false);
    }
  };

  const openTrailer = () => m?.trailerUrl && Linking.openURL(m.trailerUrl).catch(() => {});

  if (isLoading) return <View style={styles.root}><Loading /></View>;
  if (isError || !m) return <SafeAreaView style={styles.root}><ErrorState message={(error as Error)?.message ?? 'Film indisponibil.'} onRetry={() => refetch()} /></SafeAreaView>;

  const meta = [m.year, m.runtime ? `${m.runtime} min` : null].filter(Boolean).join(' · ');

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: isGuest ? 30 : 110 }}>
        <View style={styles.hero}>
          <Poster uri={m.posterUrl} title={m.title} id={m.id} />
          <LinearGradient colors={['rgba(10,15,36,0.5)', 'transparent', Colors.bg]} locations={[0, 0.4, 1]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']} style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={styles.circle} hitSlop={8}><Ionicons name="arrow-back" size={22} color="#fff" /></Pressable>
            {!isGuest && (
              <Pressable onPress={toggle} style={styles.circle} hitSlop={8}>
                <Ionicons name={inList ? 'bookmark' : 'bookmark-outline'} size={20} color={inList ? Colors.primary : '#fff'} />
              </Pressable>
            )}
          </SafeAreaView>
          {!!m.trailerUrl && (
            <Pressable onPress={openTrailer} style={styles.play}><Ionicons name="play" size={30} color="#fff" /></Pressable>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>{m.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>{meta}</Text>
            {m.rating !== null && (<><Ionicons name="star" size={14} color={Colors.star} /><Text style={styles.meta}>{m.rating.toFixed(1)}</Text></>)}
          </View>

          {m.genres.length > 0 && (
            <View style={styles.chips}>{m.genres.map((g) => <Chip key={g} label={g} />)}</View>
          )}

          {!!m.overview && <Text style={styles.overview}>{m.overview}</Text>}

          {!!m.trailerUrl && (
            <>
              <Text style={styles.section}>Trailer</Text>
              <Pressable onPress={openTrailer} style={styles.trailer}>
                <Ionicons name="play-circle" size={44} color="#fff" />
                <Text style={styles.trailerText}>Watch trailer</Text>
              </Pressable>
            </>
          )}

          <Text style={styles.section}>Where to watch</Text>
          {m.providers.length === 0 ? (
            <Text style={styles.muted}>Nu avem informații despre platforme.</Text>
          ) : (
            <View style={styles.providers}>
              {m.providers.map((p) => (
                <View key={String(p.id)} style={styles.provider}><Text style={styles.providerText} numberOfLines={1}>{p.name}</Text></View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {!isGuest && (
        <SafeAreaView edges={['bottom']} style={styles.footer}>
          <Pressable onPress={toggle} disabled={busy} style={({ pressed }) => [styles.btn, inList && styles.btnOn, (pressed || busy) && { opacity: 0.7 }]}>
            {busy ? <ActivityIndicator color="#1A1030" /> : <Text style={[styles.btnText, inList && { color: Colors.primary }]}>{inList ? 'In your watchlist ✓' : 'Add to watchlist'}</Text>}
          </Pressable>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { height: 420 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8 },
  circle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(10,15,36,0.6)', alignItems: 'center', justifyContent: 'center' },
  play: { position: 'absolute', alignSelf: 'center', top: 170, width: 66, height: 66, borderRadius: 33, backgroundColor: 'rgba(255,45,111,0.9)', alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, gap: 12, marginTop: -30 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { color: Colors.textMuted, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overview: { color: Colors.text, opacity: 0.85, fontSize: 14, lineHeight: 21 },
  section: { color: Colors.text, fontSize: 17, fontWeight: '800', marginTop: 8 },
  muted: { color: Colors.textMuted, fontSize: 13 },
  trailer: { height: 140, borderRadius: Radius.lg, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', gap: 6 },
  trailerText: { color: Colors.text, fontWeight: '700' },
  providers: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  provider: { paddingHorizontal: 14, height: 40, borderRadius: 12, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  providerText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 10, paddingTop: 10, backgroundColor: Colors.bg },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnOn: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
});
