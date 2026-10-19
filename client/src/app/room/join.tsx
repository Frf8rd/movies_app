import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CODE_LENGTH, CodeInput, formatCode } from '@/components/room/CodeInput';
import { Colors, Radius } from '@/constants/theme';
import { joinRoom } from '@/services/rooms';

// Intrare în cameră pentru utilizatorii LOGAȚI (fără poreclă – numele vine din cont).
export default function JoinRoomScreen() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.length === CODE_LENGTH && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const { room } = await joinRoom(formatCode(code));
      qc.invalidateQueries({ queryKey: ['rooms'] });
      router.replace({ pathname: '/room/[id]/lobby', params: { id: String(room.id) } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(91,43,217,0.5)', Colors.bg]} style={styles.glow} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={Colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Join a room</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.hero}>
          <LinearGradient colors={[Colors.pink, Colors.primary]} style={styles.ticket}>
            <Ionicons name="ticket" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.hint}>Enter the 6-character code{'\n'}from your friend</Text>
        </View>

        <CodeInput value={code} onChange={setCode} onComplete={onSubmit} autoFocus />

        {error && <Text style={styles.error}>{error}</Text>}

        <Pressable onPress={onSubmit} disabled={!canSubmit} style={({ pressed }) => [styles.btn, (!canSubmit || pressed) && { opacity: 0.5 }]}>
          {loading ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Join room</Text>}
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  safe: { flex: 1, paddingHorizontal: 24, gap: 18 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  headerTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  hero: { alignItems: 'center', gap: 14, marginTop: 24, marginBottom: 12 },
  ticket: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.text, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
});
