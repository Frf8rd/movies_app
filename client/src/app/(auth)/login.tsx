import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/Logo';
import { Colors, Radius } from '@/constants/theme';
import { login } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const onSubmit = async () => {
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
    <View style={styles.root}>
      <LinearGradient colors={[Colors.purple, Colors.pink, Colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero} />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={styles.logo}>
            <Logo size={34} />
            <Text style={styles.welcome}>Welcome back!</Text>
            <Text style={styles.sub}>Log in to continue</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <Ionicons name="mail-outline" size={18} color={Colors.textMuted} />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
            </View>
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!show}
                autoCapitalize="none"
                style={styles.input}
                onSubmitEditing={canSubmit ? onSubmit : undefined}
              />
              <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
              </Pressable>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <Pressable
              onPress={onSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [styles.btn, (!canSubmit || pressed) && { opacity: 0.6 }]}>
              {loading ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>Log in</Text>}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  hero: { position: 'absolute', top: 0, left: 0, right: 0, height: 260, borderBottomLeftRadius: 60, borderBottomRightRadius: 60, opacity: 0.9 },
  safe: { flex: 1 },
  flex: { flex: 1, paddingHorizontal: 24 },
  logo: { alignItems: 'center', gap: 6, marginTop: 56, marginBottom: 56 },
  welcome: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 16 },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  form: { gap: 14, marginTop: 40 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: { flex: 1, color: Colors.text, fontSize: 15 },
  error: { color: Colors.danger, fontSize: 13 },
  btn: { height: 52, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  btnText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
});
