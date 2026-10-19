import { Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/ui/Chip';
import { ProviderTile } from '@/components/ui/ProviderTile';
import { ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useGenres, useProfile, useProviders } from '@/hooks/queries';
import { savePreferences } from '@/services/catalog';
import type { Id } from '@/types/models';

const MIN_GENRES = 3;
const MIN_PROVIDERS = 2;

const toggle = (list: Id[], id: Id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const goHome = () => router.replace('/(tabs)' as Href);

export default function OnboardingScreen() {
  const genres = useGenres();
  const providers = useProviders();
  const profile = useProfile();
  const prefilled = useRef(false);
  const [genreIds, setGenreIds] = useState<Id[]>([]);
  const [providerIds, setProviderIds] = useState<Id[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // când editezi preferințele existente, pornește de la ce ai ales deja
  useEffect(() => {
    if (prefilled.current || !profile.data) return;
    prefilled.current = true;
    if (profile.data.genres.length) setGenreIds(profile.data.genres.map((g) => g.id));
    if (profile.data.providers.length) setProviderIds(profile.data.providers.map((p) => p.id));
  }, [profile.data]);

  const canContinue = genreIds.length >= MIN_GENRES && providerIds.length >= MIN_PROVIDERS && !saving;

  const onContinue = async () => {
    setError(null);
    setSaving(true);
    try {
      await savePreferences(genreIds, providerIds);
      goHome();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const failed = genres.isError || providers.isError;
  const loading = genres.isLoading || providers.isLoading;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Choose your preferences</Text>
        <Text style={styles.sub}>Help us find better movie matches for you and your friends.</Text>

        {loading && <Loading />}
        {failed && (
          <ErrorState
            message={((genres.error ?? providers.error) as Error)?.message ?? 'Eroare la încărcare.'}
            onRetry={() => {
              genres.refetch();
              providers.refetch();
            }}
          />
        )}

        {!loading && !failed && (
          <>
            <Text style={styles.section}>
              Favorite genres <Text style={styles.hint}>(select at least {MIN_GENRES})</Text>
            </Text>
            <View style={styles.chips}>
              {genres.data?.map((g) => (
                <Chip key={String(g.id)} label={g.name} selected={genreIds.includes(g.id)} onPress={() => setGenreIds((l) => toggle(l, g.id))} />
              ))}
            </View>

            <Text style={styles.section}>
              Streaming platforms <Text style={styles.hint}>(select at least {MIN_PROVIDERS})</Text>
            </Text>
            <View style={styles.grid}>
              {providers.data?.map((p) => (
                <ProviderTile key={String(p.id)} provider={p} selected={providerIds.includes(p.id)} onPress={() => setProviderIds((l) => toggle(l, p.id))} />
              ))}
            </View>
          </>
        )}

        {error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable onPress={onContinue} disabled={!canContinue} style={({ pressed }) => [styles.btn, (!canContinue || pressed) && { opacity: 0.5 }]}>
          {saving ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Continue</Text>}
        </Pressable>
        <Pressable onPress={goHome} hitSlop={8}>
          <Text style={styles.skip}>Skip for now</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: 20, paddingBottom: 16 },
  title: { color: Colors.text, fontSize: 24, fontWeight: '800', marginTop: 12 },
  sub: { color: Colors.textMuted, fontSize: 13, marginTop: 6, marginBottom: 20 },
  section: { color: Colors.text, fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 12 },
  hint: { color: Colors.textMuted, fontWeight: '400', fontSize: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  error: { color: Colors.danger, fontSize: 13, marginTop: 16 },
  footer: { paddingHorizontal: 20, paddingBottom: 12, gap: 12, alignItems: 'center' },
  btn: { alignSelf: 'stretch', height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
  skip: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
});
