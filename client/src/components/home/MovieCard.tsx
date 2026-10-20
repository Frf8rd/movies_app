import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Poster } from '@/components/movie/Poster';
import { Colors } from '@/constants/theme';
import type { Movie } from '@/types/models';

export const CARD_WIDTH = 132;

// Poster mare (din backend: movie.posterUrl) cu rating pe colț și titlul + anul peste imagine.
export function MovieCard({ movie, onPress, width = CARD_WIDTH }: { movie: Movie; onPress: () => void; width?: number }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, { width, height: width * 1.5 }, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}>
      <Poster uri={movie.posterUrl} title={movie.title} id={movie.id} style={StyleSheet.absoluteFill} />

      {movie.rating !== null && (
        <View style={styles.rating}>
          <Ionicons name="star" size={10} color={Colors.star} />
          <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
        </View>
      )}

      <LinearGradient colors={['transparent', 'rgba(10,15,36,0.95)']} style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{movie.title}</Text>
        {movie.year !== null && <Text style={styles.year}>{movie.year}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  rating: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, height: 22, borderRadius: 11, backgroundColor: 'rgba(10,15,36,0.75)' },
  ratingText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  info: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingTop: 36, paddingBottom: 10, gap: 1 },
  title: { color: Colors.text, fontSize: 13, fontWeight: '800', lineHeight: 16 },
  year: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600' },
});
