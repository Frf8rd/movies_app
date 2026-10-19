import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from 'react';
import { Animated, Dimensions, PanResponder, StyleSheet, Text, View } from 'react-native';

import { Poster } from '@/components/movie/Poster';
import { Colors, Radius } from '@/constants/theme';
import type { MovieDetail } from '@/types/models';

export type SwipeChoice = 'LIKE' | 'DISLIKE' | 'SUPER';
export type DeckHandle = { swipe: (c: SwipeChoice) => void };

const { width: W, height: H } = Dimensions.get('window');
const THRESHOLD = 110;

// Card cu swipe: dreapta = Like, stânga = Dislike, sus = Super like.
// Folosește Animated + PanResponder din React Native (fără dependențe native extra).
export const SwipeDeck = forwardRef<DeckHandle, { movie: MovieDetail; next?: MovieDetail; onVote: (c: SwipeChoice) => void }>(
  function SwipeDeck({ movie, next, onVote }, ref) {
    const pan = useRef(new Animated.ValueXY()).current;
    const busy = useRef(false);
    const onVoteRef = useRef(onVote);
    onVoteRef.current = onVote;

    const fling = (choice: SwipeChoice) => {
      if (busy.current) return;
      busy.current = true;
      const to = choice === 'LIKE' ? { x: W * 1.4, y: 0 } : choice === 'DISLIKE' ? { x: -W * 1.4, y: 0 } : { x: 0, y: -H };
      Animated.timing(pan, { toValue: to, duration: 220, useNativeDriver: false }).start(() => onVoteRef.current(choice));
    };
    const flingRef = useRef(fling);
    flingRef.current = fling;

    useImperativeHandle(ref, () => ({ swipe: (c) => flingRef.current(c) }));

    // când vine următorul film, readucem cardul la centru (înainte de paint)
    useLayoutEffect(() => {
      pan.setValue({ x: 0, y: 0 });
      busy.current = false;
    }, [movie.id, pan]);

    const responder = useRef(
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
        onPanResponderMove: (_, g) => {
          if (!busy.current) pan.setValue({ x: g.dx, y: g.dy });
        },
        onPanResponderRelease: (_, g) => {
          if (busy.current) return;
          if (g.dx > THRESHOLD) flingRef.current('LIKE');
          else if (g.dx < -THRESHOLD) flingRef.current('DISLIKE');
          else if (g.dy < -THRESHOLD) flingRef.current('SUPER');
          else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        },
      }),
    ).current;

    const rotate = pan.x.interpolate({ inputRange: [-W, 0, W], outputRange: ['-14deg', '0deg', '14deg'] });
    const likeOp = pan.x.interpolate({ inputRange: [20, THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' });
    const nopeOp = pan.x.interpolate({ inputRange: [-THRESHOLD, -20], outputRange: [1, 0], extrapolate: 'clamp' });
    const superOp = pan.y.interpolate({ inputRange: [-THRESHOLD, -20], outputRange: [1, 0], extrapolate: 'clamp' });

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
          <Animated.View style={[styles.stamp, styles.stampLike, { opacity: likeOp }]}><Text style={[styles.stampText, { color: '#22D3C5' }]}>LIKE</Text></Animated.View>
          <Animated.View style={[styles.stamp, styles.stampNope, { opacity: nopeOp }]}><Text style={[styles.stampText, { color: Colors.pink }]}>NOPE</Text></Animated.View>
          <Animated.View style={[styles.stamp, styles.stampSuper, { opacity: superOp }]}><Text style={[styles.stampText, { color: Colors.purpleLight }]}>SUPER</Text></Animated.View>
        </Animated.View>
      </View>
    );
  },
);

function CardBody({ movie }: { movie: MovieDetail }) {
  const meta = [movie.year, movie.runtime ? `${movie.runtime} min` : null].filter(Boolean).join(' · ');
  return (
    <>
      <View style={styles.poster}>
        <Poster uri={movie.posterUrl} title={movie.title} id={movie.id} />
        <LinearGradient colors={['transparent', 'rgba(10,15,36,0.85)']} style={styles.fade} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{meta}</Text>
          {movie.rating !== null && (
            <>
              <Ionicons name="star" size={13} color={Colors.star} />
              <Text style={styles.meta}>{movie.rating.toFixed(1)}</Text>
            </>
          )}
        </View>
        {movie.genres.length > 0 && <Text style={styles.genres} numberOfLines={1}>{movie.genres.join(' · ')}</Text>}
        {movie.providers.length > 0 && <Text style={styles.providers} numberOfLines={1}>{movie.providers.map((p) => p.name).join(' · ')}</Text>}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  stack: { flex: 1 },
  card: { ...StyleSheet.absoluteFillObject, borderRadius: 24, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  behind: { transform: [{ scale: 0.95 }], opacity: 0.7 },
  poster: { flex: 1 },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 },
  info: { padding: 16, gap: 4, alignItems: 'center' },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  meta: { color: Colors.textMuted, fontSize: 13 },
  genres: { color: Colors.text, fontSize: 12, opacity: 0.8 },
  providers: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  stamp: { position: 'absolute', top: 28, borderWidth: 3, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  stampLike: { left: 22, borderColor: '#22D3C5', transform: [{ rotate: '-12deg' }] },
  stampNope: { right: 22, borderColor: Colors.pink, transform: [{ rotate: '12deg' }] },
  stampSuper: { alignSelf: 'center', top: 60, borderColor: Colors.purpleLight },
  stampText: { fontSize: 26, fontWeight: '900', letterSpacing: 2 },
});
