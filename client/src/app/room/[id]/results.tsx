import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Poster } from '@/components/movie/Poster';
import { EmptyState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useResults } from '@/hooks/queries';
import { pickMovie } from '@/services/rooms';
import { useAuth } from '@/store/auth';
import type { Id, ResultItem } from '@/types/models';
import { leaveToHome } from '@/utils/nav';

const RANK_COLORS = ['#FFB020', '#B8C0D9', '#C47A3D'];

export default function ResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const isGuest = useAuth((s) => s.isGuest);
  const results = useResults(id);
  const [picking, setPicking] = useState<Id | null>(null);
  const [picked, setPicked] = useState<Id | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const data = results.data;
  const pickedId = picked ?? data?.pickedMovieId ?? null;
  const hasUnanimous = !!data && data.top.length > 0;
  const main = hasUnanimous ? data!.top.slice(0, 3) : (data?.compromises ?? []).slice(0, 3);
  const others = hasUnanimous ? data!.top.slice(3) : (data?.compromises ?? []).slice(3);

  const onPick = async (item: ResultItem) => {
    setErr(null);
    setPicking(item.movie.id);
    try {
      await pickMovie(id, item.movie.id);
      setPicked(item.movie.id);
      qc.invalidateQueries({ queryKey: ['rooms'] });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setPicking(null);
    }
  };

  const onShare = () => {
    const best = main[0];
    if (best) Share.share({ message: `We're watching "${best.movie.title}" (${Math.round(best.score)}% match) — picked with ReelMatch!` });
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Colors.primary, Colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={leaveToHome} hitSlop={12}><Ionicons name="arrow-back" size={24} color="#fff" /></Pressable>
            <Text style={styles.headerTitle}>Results</Text>
            <Pressable onPress={onShare} hitSlop={12}><Ionicons name="share-outline" size={22} color="#fff" /></Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {results.isLoading ? (
        <Loading />
      ) : results.isError ? (
        // 403 cât timp se mai votează: refetch automat la 4s
        <View style={styles.waiting}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.waitText}>Waiting for everyone to finish voting…</Text>
        </View>
      ) : !data || main.length === 0 ? (
        <EmptyState message="Nu există filme în rezultate." />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>{hasUnanimous ? 'Top matches for your group' : 'Closest compromise'}</Text>
          <Text style={styles.sub}>
            {hasUnanimous ? "Based on everyone's votes" : 'No movie was accepted by everyone — these had the fewest dislikes.'}
          </Text>

          {main.map((item, i) => {
            const isPicked = String(pickedId) === String(item.movie.id);
            return (
              <View key={String(item.movie.id)} style={[styles.card, isPicked && { borderColor: '#22D3C5' }]}>
                <Pressable onPress={() => router.push(`/movie/${item.movie.id}` as Href)} style={styles.poster}>
                  <Poster uri={item.movie.posterUrl} title={item.movie.title} id={item.movie.id} />
                  <View style={[styles.rank, { backgroundColor: RANK_COLORS[i] }]}><Text style={styles.rankText}>{i + 1}</Text></View>
                </Pressable>
                <View style={styles.info}>
                  <Text style={styles.movieTitle} numberOfLines={1}>{item.movie.title}</Text>
                  <Text style={styles.match}>{Math.round(item.score)}% compatibility</Text>
                  <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.min(100, Math.round(item.score))}%` }]} /></View>
                  {isPicked ? (
                    <View style={styles.pickedTag}><Ionicons name="checkmark-circle" size={16} color="#22D3C5" /><Text style={styles.pickedText}>Tonight's pick</Text></View>
                  ) : !pickedId ? (
                    <Pressable onPress={() => onPick(item)} disabled={picking !== null} style={({ pressed }) => [styles.pickBtn, (pressed || picking !== null) && { opacity: 0.6 }]}>
                      {picking === item.movie.id ? <ActivityIndicator color="#1A1030" size="small" /> : <Text style={styles.pickText}>Choose this movie</Text>}
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}

          {err && <Text style={styles.error}>{err}</Text>}

          {others.length > 0 && (
            <>
              <Text style={styles.section}>Other good options</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {others.map((item) => (
                  <Pressable key={String(item.movie.id)} onPress={() => router.push(`/movie/${item.movie.id}` as Href)} style={styles.small}>
                    <View style={styles.smallPoster}><Poster uri={item.movie.posterUrl} title={item.movie.title} id={item.movie.id} /></View>
                    <Text style={styles.smallTitle} numberOfLines={1}>{item.movie.title}</Text>
                    <Text style={styles.smallMatch}>{Math.round(item.score)}%</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </>
          )}

          <Pressable onPress={leaveToHome} style={styles.done}>
            <Text style={styles.doneText}>{isGuest ? 'Leave' : 'Back to home'}</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  waitText: { color: Colors.textMuted, fontSize: 14 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  title: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  sub: { color: Colors.textMuted, fontSize: 13, marginBottom: 4 },
  card: { flexDirection: 'row', gap: 14, padding: 12, borderRadius: Radius.lg, backgroundColor: Colors.card, borderWidth: 1.5, borderColor: Colors.border },
  poster: { width: 84, height: 122, borderRadius: 12, overflow: 'hidden' },
  rank: { position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  rankText: { color: '#1A1030', fontWeight: '900', fontSize: 13 },
  info: { flex: 1, justifyContent: 'center', gap: 6 },
  movieTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  match: { color: Colors.textMuted, fontSize: 13 },
  bar: { height: 5, borderRadius: 3, backgroundColor: Colors.border, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.primary },
  pickBtn: { height: 38, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  pickText: { color: '#1A1030', fontWeight: '800', fontSize: 13 },
  pickedTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  pickedText: { color: '#22D3C5', fontWeight: '800', fontSize: 13 },
  error: { color: Colors.danger, textAlign: 'center', fontSize: 13 },
  section: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 10 },
  small: { width: 96, gap: 4 },
  smallPoster: { width: 96, height: 140, borderRadius: 10, overflow: 'hidden' },
  smallTitle: { color: Colors.text, fontSize: 12, fontWeight: '700' },
  smallMatch: { color: Colors.textMuted, fontSize: 11 },
  done: { marginTop: 16, height: 50, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  doneText: { color: Colors.text, fontWeight: '800' },
});
