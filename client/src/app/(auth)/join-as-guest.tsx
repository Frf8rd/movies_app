import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CODE_LENGTH, CodeInput, formatCode } from '@/components/room/CodeInput';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius } from '@/constants/theme';
import { joinAsGuest } from '@/services/rooms';

export default function JoinAsGuestScreen() {
  const [code, setCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.length === CODE_LENGTH && nickname.trim().length >= 2 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      // README: codul apare ca K7F-29Q. Dacă backend-ul îl vrea fără cratimă, trimite `code` direct.
      const room = await joinAsGuest(formatCode(code), nickname.trim());
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
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

          <CodeInput value={code} onChange={setCode} autoFocus />

          <Text style={styles.label}>Your nickname</Text>
          <TextField
            icon="person-outline"
            placeholder="Alex"
            value={nickname}
            onChangeText={setNickname}
            autoCapitalize="words"
            maxLength={24}
            onSubmitEditing={onSubmit}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable onPress={onSubmit} disabled={!canSubmit} style={({ pressed }) => [styles.btn, (!canSubmit || pressed) && { opacity: 0.5 }]}>
            {loading ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Join room</Text>}
          </Pressable>

          <Text style={styles.footer}>You don't need an account{'\n'}to join a room.</Text>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 260 },
  safe: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 24, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  headerTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  hero: { alignItems: 'center', gap: 14, marginTop: 16, marginBottom: 10 },
  ticket: { width: 76, height: 76, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  hint: { color: Colors.text, fontSize: 15, textAlign: 'center', lineHeight: 21 },
  label: { color: Colors.text, fontSize: 15, fontWeight: '700', marginTop: 18 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center' },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
  footer: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
