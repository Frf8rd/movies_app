import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/Logo';
import { TextField } from '@/components/ui/TextField';
import { Colors, Radius } from '@/constants/theme';
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
    <View style={styles.root}>
      <LinearGradient colors={[Colors.pink, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.logo}>
              <Logo size={34} />
              <Text style={styles.title}>Create your account</Text>
            </View>

            <View style={styles.form}>
              <TextField icon="person-outline" placeholder="Full name" value={name} onChangeText={setName} autoCapitalize="words" invalid={touched && !!errors.name} />
              <TextField icon="mail-outline" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" invalid={touched && !!errors.email} />
              <TextField icon="lock-closed-outline" placeholder="Password" value={password} onChangeText={setPassword} password invalid={touched && !!errors.password} />
              <TextField
                icon="shield-checkmark-outline"
                placeholder="Confirm password"
                value={confirm}
                onChangeText={setConfirm}
                password
                invalid={touched && !!errors.confirm}
                onSubmitEditing={onSubmit}
              />

              {touched && firstError && <Text style={styles.error}>{firstError}</Text>}
              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={onSubmit} disabled={loading} style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.6 }]}>
                {loading ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Create account</Text>}
              </Pressable>

              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account? </Text>
                <Pressable onPress={() => router.replace('/login')} hitSlop={8}>
                  <Text style={styles.switchLink}>Log in</Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: 220, borderBottomLeftRadius: 60, borderBottomRightRadius: 60, opacity: 0.9 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 24 },
  logo: { alignItems: 'center', gap: 6, marginTop: 40, marginBottom: 40 },
  title: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 16 },
  form: { gap: 14, marginTop: 8 },
  error: { color: Colors.danger, fontSize: 13 },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  switchText: { color: Colors.textMuted, fontSize: 13 },
  switchLink: { color: Colors.primary, fontSize: 13, fontWeight: '800' },
});
