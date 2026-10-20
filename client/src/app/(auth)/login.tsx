import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/ui/AuthShell';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { login } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Stack.Protected din _layout te duce automat în (tabs)
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back!"
      subtitle="Log in to continue your movie night"
      footer={
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Don't have an account? </Text>
          <Pressable onPress={() => router.replace('/register' as any)} hitSlop={8}>
            <Text style={styles.switchLink}>Sign up</Text>
          </Pressable>
        </View>
      }>
      <TextField label="Email" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" />
      <TextField label="Password" icon="lock-closed-outline" placeholder="Your password" value={password} onChangeText={setPassword} password onSubmitEditing={onSubmit} />

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      <GradientButton label="Log in" onPress={onSubmit} loading={loading} disabled={!canSubmit && !loading} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,84,112,0.12)' },
  error: { flex: 1, color: Colors.danger, fontSize: 13 },
  switchRow: { flexDirection: 'row', justifyContent: 'center' },
  switchText: { color: Colors.textMuted, fontSize: 14 },
  switchLink: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
});
