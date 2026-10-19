import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useProfile, useStats } from '@/hooks/queries';
import { logoutRemote } from '@/services/auth';
import { useAuth } from '@/store/auth';

export default function ProfileScreen() {
  const storeUser = useAuth((s) => s.user);
  const profile = useProfile();
  const stats = useStats();

  const user = profile.data?.user ?? storeUser;

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Colors.pink, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.heroRow}>
            <Avatar uri={user?.avatarUrl} name={user?.name} size={64} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{user?.name || 'Profile'}</Text>
              {!!user?.email && <Text style={styles.email} numberOfLines={1}>{user.email}</Text>}
            </View>
            <Pressable onPress={() => router.push('/settings' as Href)} hitSlop={10}>
              <Ionicons name="settings-outline" size={24} color="#fff" />
            </Pressable>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stats}>
          <Stat icon="people" value={stats.data ? String(stats.data.movieNights) : '–'} label="Movie nights" />
          <Stat icon="heart" value={stats.data?.favoriteGenre ?? '–'} label="Top genre" />
          <Stat icon="eye" value={stats.data ? String(stats.data.watchedCount) : '–'} label="Watched" />
        </View>

        {profile.isLoading ? <Loading /> : (
          <>
            <Text style={styles.section}>My genres</Text>
            <View style={styles.chips}>
              {profile.data?.genres.length ? profile.data.genres.map((g) => <Chip key={String(g.id)} label={g.name} />) : <Text style={styles.muted}>Nu ai ales genuri încă.</Text>}
            </View>
            <Text style={styles.section}>My platforms</Text>
            <View style={styles.chips}>
              {profile.data?.providers.length ? profile.data.providers.map((p) => <Chip key={String(p.id)} label={p.name} />) : <Text style={styles.muted}>Nu ai ales platforme încă.</Text>}
            </View>
          </>
        )}

        <Pressable onPress={() => router.push('/onboarding' as Href)} style={styles.link}>
          <Ionicons name="options-outline" size={20} color={Colors.text} />
          <Text style={styles.linkText}>Edit genres & platforms</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </Pressable>

        <Pressable onPress={logoutRemote} style={styles.logout}>
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={18} color={Colors.primary} />
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingBottom: 22 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingTop: 10 },
  name: { color: '#fff', fontSize: 22, fontWeight: '800' },
  email: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 2 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 14, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  statValue: { color: Colors.text, fontSize: 18, fontWeight: '800', paddingHorizontal: 6 },
  statLabel: { color: Colors.textMuted, fontSize: 11 },
  section: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  muted: { color: Colors.textMuted, fontSize: 13 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, marginTop: 8 },
  linkText: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: 14 },
  logout: { height: 50, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.danger, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  logoutText: { color: Colors.danger, fontWeight: '800', fontSize: 15 },
});
