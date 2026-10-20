import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthShell } from '@/components/ui/AuthShell';
import { GradientButton } from '@/components/ui/GradientButton';
import { TextField } from '@/components/ui/TextField';
import { Colors } from '@/constants/theme';
import { register } from '@/services/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // validare locală (backend-ul validează oricum încă o dată)
  const errors = {
    name: name.trim().length < 2 ? 'Introdu numele tău.' : null,
    email: !EMAIL_RE.test(email.trim()) ? 'Email invalid.' : null,
    password: password.length < 8 ? 'Parola trebuie să aibă minim 8 caractere.' : null,
    confirm: confirm !== password ? 'Parolele nu coincid.' : null,
  };
  const firstError = errors.name || errors.email || errors.password || errors.confirm;

  const onSubmit = async () => {
    setTouched(true);
    setError(null);
    if (firstError) return;
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password);
      // cont nou -> alegi genurile și platformele (o singură dată)
      router.replace('/onboarding' as Href);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Vote on movies with your friends"
      footer={
        <View style={styles.switchRow}>
          <Text style={styles.switchText}>Already have an account? </Text>
          <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
            <Text style={styles.switchLink}>Log in</Text>
          </Pressable>
        </View>
      }>
      <TextField label="Full name" icon="person-outline" placeholder="Alex Popescu" value={name} onChangeText={setName} autoCapitalize="words" invalid={touched && !!errors.name} />
      <TextField label="Email" icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} keyboardType="email-address" autoComplete="email" invalid={touched && !!errors.email} />
      <TextField label="Password" icon="lock-closed-outline" placeholder="At least 8 characters" value={password} onChangeText={setPassword} password invalid={touched && !!errors.password} />
      <TextField label="Confirm password" icon="shield-checkmark-outline" placeholder="Repeat your password" value={confirm} onChangeText={setConfirm} password invalid={touched && !!errors.confirm} onSubmitEditing={onSubmit} />

      {((touched && firstError) || error) && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={16} color={Colors.danger} />
          <Text style={styles.error}>{error ?? firstError}</Text>
        </View>
      )}

      <GradientButton label="Create account" onPress={onSubmit} loading={loading} />
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
