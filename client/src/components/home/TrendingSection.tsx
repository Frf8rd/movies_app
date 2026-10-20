import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { MovieCard } from '@/components/home/MovieCard';
import { EmptyState, ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors } from '@/constants/theme';
import { useTrending } from '@/hooks/queries';

export function TrendingSection() {
  const { data, isLoading, isError, error, refetch } = useTrending();

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.heading}>Trending now</Text>
        <Pressable hitSlop={8} onPress={() => router.push('/movies')}>
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !data || data.length === 0 ? (
        <EmptyState message="Nu există filme în tendințe momentan." />
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(m) => String(m.id)}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <MovieCard movie={item} onPress={() => router.push(`/movie/${item.id}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { color: Colors.text, fontSize: 18, fontWeight: '800' },
  seeAll: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  list: { gap: 14, paddingRight: 8 },
});
