import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MovieCard } from '@/components/home/MovieCard';
import { EmptyState, ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors } from '@/constants/theme';
import { useTrending } from '@/hooks/queries';

// „See all" din Home: toate filmele în tendințe, în grilă.
export default function AllMoviesScreen() {
  const { data, isLoading, isError, error, refetch, isRefetching } = useTrending();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Trending films</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState message="Nu există filme în tendințe momentan." />
      ) : (
        <FlatList
          data={data}
          numColumns={3}
          keyExtractor={(m) => String(m.id)}
          columnWrapperStyle={styles.col}
          contentContainerStyle={styles.list}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => <MovieCard movie={item} onPress={() => router.push(`/movie/${item.id}` as Href)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 20 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  list: { padding: 20, gap: 18 },
  col: { justifyContent: 'space-between' },
});
