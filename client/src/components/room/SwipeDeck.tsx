import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';

import { Poster } from '@/components/movie/Poster';
import { Colors } from '@/constants/theme';
import type { MovieDetail } from '@/types/models';

export type SwipeChoice = 'LIKE' | 'DISLIKE';
export type DeckHandle = { swipe: (c: SwipeChoice) => void };

const { width: W } = Dimensions.get('window');
const THRESHOLD = 110;
const LIKE = '#22D3C5';

// Card cu swipe: dreapta = Like, stânga = Dislike.
// Folosește Animated + PanResponder din React Native (fără dependențe native extra).
export const SwipeDeck = forwardRef<DeckHandle, { movie: MovieDetail; next?: MovieDetail; onVote: (c: SwipeChoice) => void }>(
  function SwipeDeck({ movie, next, onVote }, ref) {
    // IMPORTANT: componenta este remontată pentru fiecare film (key={movie.id} în vote.tsx),
    // deci `pan` pornește mereu de la (0,0). Nu mai resetăm manual o valoare animată nativ —
    // pe Android resetul nu se sincroniza mereu și cardul rămânea în afara ecranului (ecran gol).
    const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
    const busy = useRef(false);
    const onVoteRef = useRef(onVote);
    onVoteRef.current = onVote;

    const fling = (choice: SwipeChoice) => {
      if (busy.current) return;
      busy.current = true;
      const to = { x: choice === 'LIKE' ? W * 1.4 : -W * 1.4, y: 0 };
      // Translate/rotate are native-driver friendly; keep the fling off the JS thread
      // so loading poster images doesn't make the swipe feel delayed.
      Animated.timing(pan, { toValue: to, duration: 220, useNativeDriver: true }).start(({ finished }) => {
        if (finished) onVoteRef.current(choice);
        else {
          // animație întreruptă: readu cardul la centru ca să nu rămână blocat/invizibil
          busy.current = false;
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
      });
    };
    const flingRef = useRef(fling);
    flingRef.current = fling;

    useImperativeHandle(ref, () => ({ swipe: (c) => flingRef.current(c) }));

    const responder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          if (!busy.current) pan.setValue({ x: g.dx, y: g.dy * 0.25 });
        },
        onPanResponderRelease: (_, g) => {
          if (busy.current) return;
          if (g.dx > THRESHOLD) flingRef.current('LIKE');
          else if (g.dx < -THRESHOLD) flingRef.current('DISLIKE');
          else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        },
      }),
    ).current;

    const rotate = pan.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-12deg', '0deg', '12deg'] });
    const likeOp = pan.x.interpolate({ inputRange: [20, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
    const nopeOp = pan.x.interpolate({ inputRange: [-THRESHOLD, -20], outputRange: [1, 0], extrapolate: 'clamp' });

    return (
      <View style={styles.stack}>
        {next && (
          <View style={[styles.card, styles.behind]}>
            <CardBody movie={next} />
          </View>
        )}
        <Animated.View
          {...responder.panHandlers}
          style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}>
          <CardBody movie={movie} />
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOp }]}>
            <Text style={[styles.stampText, { color: LIKE }]}>LIKE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOp }]}>
            <Text style={[styles.stampText, { color: Colors.pink }]}>NOPE</Text>
          </Animated.View>
        </Animated.View>
      </View>
    );
  },
);

// Poster pe tot cardul (vine din backend prin movie.posterUrl), cu titlul și detaliile peste el.
function CardBody({ movie }: { movie: MovieDetail }) {
  const meta = [movie.year, movie.runtime ? `${movie.runtime} min` : null].filter(Boolean).join(' · ');
  return (
    <>
      <Poster uri={movie.posterUrl} title={movie.title} id={movie.id} style={StyleSheet.absoluteFill} />

      {movie.rating !== null && (
        <View style={styles.rating}>
          <Ionicons name="star" size={13} color={Colors.star} />
          <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
        </View>
      )}

      <LinearGradient colors={['transparent', 'rgba(10,15,36,0.88)', 'rgba(10,15,36,0.98)']} locations={[0, 0.45, 1]} style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        {movie.genres.length > 0 && (
          <View style={styles.genres}>
            {movie.genres.slice(0, 3).map((g) => (
              <View key={g} style={styles.genre}><Text style={styles.genreText}>{g}</Text></View>
            ))}
          </View>
        )}
        {!!movie.overview && <Text style={styles.overview} numberOfLines={2}>{movie.overview}</Text>}
        {movie.providers.length > 0 && (
          <Text style={styles.providers} numberOfLines={1}>{movie.providers.map((p) => p.name).join('  ·  ')}</Text>
        )}
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1 },
  card: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 28, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  behind: { transform: [{ scale: 0.95 }], opacity: 0.7 },
  rating: { position: 'absolute', zIndex: 2, elevation: 2, top: 14, right: 14, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: 'rgba(10,15,36,0.72)' },
  ratingText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  info: { position: 'absolute', zIndex: 2, elevation: 2, left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 70, paddingBottom: 22, gap: 8 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800', lineHeight: 33, letterSpacing: -0.3 },
  meta: { color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: '600' },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  genre: { paddingHorizontal: 10, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  genreText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  overview: { color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 18 },
  providers: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  stamp: { position: 'absolute', top: 34, borderWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2, backgroundColor: 'rgba(10,15,36,0.35)' },
  stampLike: { left: 22, borderColor: LIKE, transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 22, borderColor: Colors.pink, transform: [{ rotate: '12deg' }] },
  stampText: { fontSize: 28, fontWeight: '900', letterSpacing: 2 },
});