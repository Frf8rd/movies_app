import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatCode } from '@/components/room/CodeInput';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState, Loading } from '@/components/ui/StateViews';
import { Colors, Radius } from '@/constants/theme';
import { useRoom } from '@/hooks/queries';
import { leaveRoom, startRoom } from '@/services/rooms';
import { leaveToHome } from '@/utils/nav';

export default function LobbyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: room, isLoading, isError, error, refetch } = useRoom(id);
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // polling: când gazda pornește votul, toți participanții sunt duși automat la vot
  useEffect(() => {
    if (!room) return;
    if (room.status === 'VOTING') router.replace({ pathname: '/room/[id]/vote', params: { id: String(id) } });
    else if (room.status === 'RESULTS' || room.status === 'CLOSED') router.replace({ pathname: '/room/[id]/results', params: { id: String(id) } });
  }, [room?.status, id]);

  const copy = async () => {
    if (!room) return;
    await Clipboard.setStringAsync(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const share = () => room && Share.share({ message: `Join my ReelMatch room "${room.title}" with code ${formatCode(room.code)}` });

  const onStart = async () => {
    setErr(null);
    setStarting(true);
    try {
      await startRoom(id);
      await qc.invalidateQueries({ queryKey: ['room', String(id)] });
    } catch (e) {
      setErr((e as Error).message); // ex. 422: „Filtrele sunt prea stricte…"
    } finally {
      setStarting(false);
    }
  };

  const onLeave = () =>
    Alert.alert('Leave room?', 'You can rejoin later with the code.', [
      { text: 'Stay', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: () => {
          // pornim cererea (tokenul e citit imediat), dar NU așteptăm serverul: ieșim direct din ecran
          leaveRoom(id).catch(() => {}).finally(() => qc.invalidateQueries({ queryKey: ['rooms'] }));
          leaveToHome();
        },
      },
    ]);

  const f = room?.filters;
  const settings: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = f
    ? [
        { icon: 'pricetags-outline', text: f.genres.length ? f.genres.join(', ') : 'Any genre' },
        { icon: 'time-outline', text: f.maxRuntime ? `Up to ${f.maxRuntime} min` : 'Any length' },
        { icon: 'tv-outline', text: f.providers.length ? f.providers.join(', ') : 'All platforms' },
        { icon: 'calendar-outline', text: f.yearFrom ? `${f.yearFrom} – ${new Date().getFullYear()}` : 'Any year' },
        { icon: 'star-outline', text: f.minRating ? `Min. rating ${f.minRating.toFixed(1)}` : 'Any rating' },
      ]
    : [];

  return (
    <View style={styles.root}>
      <LinearGradient colors={[Colors.pink, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.header}>
            <Pressable onPress={onLeave} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </Pressable>
            <Text style={styles.headerTitle}>Room lobby</Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <Loading />
      ) : isError || !room ? (
        <ErrorState message={(error as Error)?.message ?? 'Camera nu a putut fi încărcată.'} onRetry={() => refetch()} />
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.codeBox}>
              <Pressable onPress={copy} style={styles.codeRow} hitSlop={8}>
                <Text style={styles.code}>{formatCode(room.code)}</Text>
                <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color={copied ? '#22D3C5' : Colors.textMuted} />
              </Pressable>
              <Text style={styles.codeHint}>{copied ? 'Copied!' : 'Share this code with your friends'}</Text>
            </View>

            <Text style={styles.section}>{room.title}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.members}>
              {room.members.map((m) => (
                <View key={String(m.id)} style={styles.member}>
                  <Avatar uri={m.avatarUrl} name={m.name} size={48} />
                  <Text style={styles.memberName} numberOfLines={1}>{m.isMe ? 'You' : m.name}</Text>
                </View>
              ))}
              <Pressable onPress={share} style={styles.member}>
                <View style={styles.invite}><Ionicons name="add" size={22} color={Colors.text} /></View>
                <Text style={styles.memberName}>Invite</Text>
              </Pressable>
            </ScrollView>

            <Text style={styles.section}>Room settings</Text>
            <View style={styles.settings}>
              {settings.map((s) => (
                <View key={s.icon} style={styles.setRow}>
                  <Ionicons name={s.icon} size={20} color={Colors.textMuted} />
                  <Text style={styles.setText} numberOfLines={1}>{s.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <SafeAreaView edges={['bottom']} style={styles.footer}>
            {err && <Text style={styles.error}>{err}</Text>}
            {room.isHost ? (
              <Pressable onPress={onStart} disabled={starting} style={({ pressed }) => [styles.btn, (starting || pressed) && { opacity: 0.6 }]}>
                {starting ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Start voting</Text>}
              </Pressable>
            ) : (
              <View style={styles.waiting}>
                <ActivityIndicator color={Colors.primary} />
                <Text style={styles.waitText}>Waiting for the host to start voting…</Text>
              </View>
            )}
          </SafeAreaView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { borderBottomLeftRadius: 28, borderBottomRightRadius: 28, paddingHorizontal: 20, paddingBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  content: { padding: 20, gap: 14 },
  codeBox: { alignItems: 'center', gap: 6, padding: 16, borderRadius: Radius.lg, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { color: Colors.text, fontSize: 32, fontWeight: '800', letterSpacing: 3 },
  codeHint: { color: Colors.textMuted, fontSize: 12 },
  section: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 6 },
  members: { gap: 16, paddingVertical: 4 },
  member: { alignItems: 'center', gap: 6, width: 58 },
  memberName: { color: Colors.textMuted, fontSize: 11 },
  invite: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  settings: { borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, height: 48, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  setText: { flex: 1, color: Colors.text, fontSize: 14 },
  footer: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.purpleLight, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  waiting: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', height: 52 },
  waitText: { color: Colors.textMuted, fontSize: 13 },
});
