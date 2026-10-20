import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DeckHandle, SwipeChoice, SwipeDeck } from '@/components/room/SwipeDeck';
import { ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useDeck, useProgress, useRoom } from '@/hooks/queries';
import { ApiError } from '@/services/api';
import { closeVoting, sendVote } from '@/services/rooms';
import { leaveToHome } from '@/utils/nav';

const LIKE = '#22D3C5';

type Unsent = { movieId: string | number; choice: SwipeChoice };

export default function VoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const deck = useDeck(id);
  const room = useRoom(id);
  const deckRef = useRef<DeckHandle>(null);

  const movies = deck.data ?? [];
  const [index, setIndex] = useState<number | null>(null);
  const [unsent, setUnsent] = useState<Unsent[]>([]);
  const [closing, setClosing] = useState(false);

  // pornește de la primul film nevotat (dacă ai ieșit și te-ai întors)
  useEffect(() => {
    if (deck.data && index === null) {
      const first = deck.data.findIndex((m) => !m.voted);
      setIndex(first === -1 ? deck.data.length : first);
    }
  }, [deck.data, index]);

  const total = movies.length;
  const done = index !== null && total > 0 && index >= total;
  const progress = useProgress(id, done);

  // când toți au terminat / gazda închide votul -> rezultate
  useEffect(() => {
    const st = room.data?.status;
    if (st === 'RESULTS' || st === 'CLOSED') router.replace({ pathname: '/room/[id]/results', params: { id: String(id) } });
  }, [room.data?.status, id]);

  // trimite votul în fundal, cu 3 încercări; dacă tot eșuează îl păstrăm pentru „Retry"
  const send = async (movieId: string | number, choice: SwipeChoice) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await sendVote(id, movieId, choice);
        setUnsent((u) => u.filter((x) => x.movieId !== movieId));
        return;
      } catch (e) {
        if (e instanceof ApiError && e.status === 409) { // deja votat
          setUnsent((u) => u.filter((x) => x.movieId !== movieId));
          return;
        }
        await new Promise((r) => setTimeout(r, 600 * (attempt + 1)));
      }
    }
    setUnsent((u) => (u.some((x) => x.movieId === movieId) ? u : [...u, { movieId, choice }]));
  };

  const onVote = (choice: SwipeChoice) => {
    if (index === null) return;
    const movie = movies[index];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setIndex(index + 1); // optimistic: cardul dispare imediat
    send(movie.id, choice);
  };

  const retryUnsent = () => unsent.forEach((u) => send(u.movieId, u.choice));

  const onClose = async () => {
    setClosing(true);
    try { await closeVoting(id); await qc.invalidateQueries({ queryKey: ['room', String(id)] }); } catch {} finally { setClosing(false); }
  };

  const current = index !== null ? Math.min(index + 1, total) : 0;
  const finished = progress.data?.finishedCount ?? 0;
  const members = progress.data?.members.length || room.data?.members.length || 0;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(91,43,217,0.55)', Colors.bg]} style={styles.glow} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={leaveToHome} hitSlop={12} style={styles.back}>
            <Ionicons name="arrow-back" size={22} color={Colors.text} />
          </Pressable>
          <Text style={styles.roomTitle} numberOfLines={1}>{room.data?.title ?? ''}</Text>
          <View style={styles.countPill}>
            <Text style={styles.count}>{total ? `${Math.min(current, total)}/${total}` : '–'}</Text>
          </View>
        </View>
        {total > 0 && index !== null && (
          <View style={styles.bar}>
            <View style={[styles.barFill, { width: `${Math.min(100, (index / total) * 100)}%` }]} />
          </View>
        )}

        {deck.isLoading ? (
          <Loading />
        ) : deck.isError ? (
          <ErrorState message={(deck.error as Error).message} onRetry={() => deck.refetch()} />
        ) : total === 0 ? (
          <ErrorState message="Nu există filme de votat în această cameră." />
        ) : index === null ? (
          <Loading />
        ) : done ? (
          <View style={styles.doneBox}>
            <Ionicons name="checkmark-circle" size={72} color={LIKE} />
            <Text style={styles.doneTitle}>You're done!</Text>
            <Text style={styles.doneSub}>
              {finished} of {members} finished voting.{'\n'}Results appear when everyone is done.
            </Text>
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 8 }} />
            {room.data?.isHost && (
              <Pressable onPress={onClose} disabled={closing} style={styles.closeBtn}>
                <Text style={styles.closeText}>{closing ? 'Closing…' : 'Close voting now'}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <>
            <View style={styles.deck}>
              <SwipeDeck ref={deckRef} movie={movies[index]} next={movies[index + 1]} onVote={onVote} />
            </View>

            <View style={styles.actions}>
              <Round label="Dislike" color={Colors.pink} icon="close" onPress={() => deckRef.current?.swipe('DISLIKE')} />
              <Round label="Like" color={LIKE} icon="heart" onPress={() => deckRef.current?.swipe('LIKE')} />
            </View>
            <Text style={styles.hint}>Swipe the card or tap a button</Text>
            {room.data && room.data.members.length > 1 && (
              <Text style={styles.others}>
                {room.data.members.filter((m) => m.finished).length} of {room.data.members.length} finished
              </Text>
            )}
          </>
        )}

        {unsent.length > 0 && (
          <Pressable onPress={retryUnsent} style={styles.unsent}>
            <Text style={styles.unsentText}>{unsent.length} vote(s) not sent — tap to retry</Text>
          </Pressable>
        )}
      </SafeAreaView>
    </View>
  );
}

function Round({ label, color, icon, onPress }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) {
  return (
    <View style={styles.roundWrap}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.round, { borderColor: color, backgroundColor: color + '26' }, pressed && { opacity: 0.6, transform: [{ scale: 0.95 }] }]}>
        <Ionicons name={icon} size={34} color={color} />
      </Pressable>
      <Text style={[styles.roundLabel, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  safe: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, gap: 12 },
  back: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  roomTitle: { flex: 1, color: Colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
  countPill: { minWidth: 56, height: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  count: { color: Colors.text, fontSize: 13, fontWeight: '800' },
  bar: { height: 4, borderRadius: 2, backgroundColor: Colors.border, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 2, backgroundColor: Colors.primary },
  deck: { flex: 1, marginTop: 10, marginBottom: 18 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: 56 },
  roundWrap: { alignItems: 'center', gap: 8 },
  round: { width: 76, height: 76, borderRadius: 38, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  roundLabel: { fontSize: 13, fontWeight: '800' },
  hint: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 12 },
  others: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 6, marginBottom: 4 },
  doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  doneTitle: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  doneSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  closeBtn: { marginTop: 16, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 12 },
  closeText: { color: Colors.primary, fontWeight: '800' },
  unsent: { position: 'absolute', left: 20, right: 20, bottom: 8, backgroundColor: Colors.danger, borderRadius: Radius.md, padding: 10 },
  unsentText: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 13 },
});
