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
  const members = progress.data?.total ?? room.data?.members.length ?? 0;

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(91,43,217,0.55)', Colors.bg]} style={styles.glow} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={leaveToHome} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.count}>{total ? `${current}/${total}` : ''}</Text>
        </View>

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
            <Ionicons name="checkmark-circle" size={64} color="#22D3C5" />
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
              <Round label="Super like" color={Colors.purpleLight} icon="star" big onPress={() => deckRef.current?.swipe('SUPER')} />
              <Round label="Like" color="#22D3C5" icon="heart" onPress={() => deckRef.current?.swipe('LIKE')} />
            </View>

            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(index / total) * 100}%` }]} />
            </View>
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

function Round({ label, color, icon, big, onPress }: { label: string; color: string; icon: keyof typeof Ionicons.glyphMap; big?: boolean; onPress: () => void }) {
  const size = big ? 68 : 60;
  return (
    <View style={styles.roundWrap}>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.round, { width: size, height: size, borderRadius: size / 2, borderColor: color, backgroundColor: color + '33' }, pressed && { opacity: 0.6 }]}>
        <Ionicons name={icon} size={big ? 30 : 26} color={color} />
      </Pressable>
      <Text style={styles.roundLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  safe: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  count: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  deck: { flex: 1, marginTop: 8, marginBottom: 16 },
  actions: { flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', gap: 28 },
  roundWrap: { alignItems: 'center', gap: 6 },
  round: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  roundLabel: { color: Colors.textMuted, fontSize: 11 },
  bar: { height: 5, borderRadius: 3, backgroundColor: Colors.border, marginTop: 14, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: Colors.purpleLight },
  others: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 4 },
  doneBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  doneTitle: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  doneSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  closeBtn: { marginTop: 16, borderWidth: 1.5, borderColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 12 },
  closeText: { color: Colors.primary, fontWeight: '800' },
  unsent: { position: 'absolute', left: 20, right: 20, bottom: 8, backgroundColor: Colors.danger, borderRadius: Radius.md, padding: 10 },
  unsentText: { color: '#fff', textAlign: 'center', fontWeight: '700', fontSize: 13 },
});
