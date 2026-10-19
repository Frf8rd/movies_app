import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Poster } from '@/components/movie/Poster';
import { Colors, Radius } from '@/constants/theme';
import type { Movie } from '@/types/models';

// Rând: poster mic + titlu + „2024 · 166 min" + un element în dreapta (buton, stele…).
export function MovieRow({ movie, onPress, right, below }: { movie: Movie; onPress?: () => void; right?: React.ReactNode; below?: React.ReactNode }) {
  const meta = [movie.year, movie.runtime ? `${movie.runtime} min` : null].filter(Boolean).join(' · ');
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && onPress ? { opacity: 0.8 } : null]}>
      <View style={styles.poster}>
        <Poster uri={movie.posterUrl} title={movie.title} id={movie.id} />
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{movie.title}</Text>
        {!!meta && <Text style={styles.meta}>{meta}</Text>}
        {below}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  poster: { width: 52, height: 76, borderRadius: 8, overflow: 'hidden' },
  info: { flex: 1, gap: 3 },
  title: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  meta: { color: Colors.textMuted, fontSize: 12 },
});
