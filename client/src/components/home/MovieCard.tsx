import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Movie } from '@/types/models';

export const CARD_WIDTH = 104;

export function MovieCard({ movie, onPress }: { movie: Movie; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed && { opacity: 0.85 }]}>
      <View style={styles.poster}>
        {movie.posterUrl ? (
          <Image source={{ uri: movie.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        ) : (
          <View style={styles.noPoster}>
            <Ionicons name="film-outline" size={26} color={Colors.textMuted} />
          </View>
        )}
      </View>
      <Text style={styles.title} numberOfLines={1}>
        {movie.title}
      </Text>
      {movie.rating !== null && (
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={11} color={Colors.star} />
          <Text style={styles.rating}>{movie.rating.toFixed(1)}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { width: CARD_WIDTH, gap: 4 },
  poster: { width: CARD_WIDTH, height: CARD_WIDTH * 1.5, borderRadius: Radius.sm, overflow: 'hidden', backgroundColor: Colors.card },
  noPoster: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.text, fontSize: 11.5, fontWeight: '600', marginTop: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { color: Colors.text, fontSize: 11.5, fontWeight: '700' },
});
