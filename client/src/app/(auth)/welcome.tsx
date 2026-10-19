import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/Logo';
import { Colors, Radius } from '@/constants/theme';

// register și join-as-guest se creează în pașii următori; cast-ul `as Href`
// evită erorile de tipuri până când Expo Router generează rutele.
const go = (path: string) => router.push(path as Href);

export default function WelcomeScreen() {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(91,43,217,0.55)', 'rgba(255,45,111,0.25)', Colors.bg]}
        locations={[0, 0.45, 0.85]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <View style={styles.hero}>
          <Image source={require('../../../assets/images/logo-glow.png')} style={styles.glow} resizeMode="contain" />
          <Logo size={44} />
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.title}>Less searching.{'\n'}More watching.</Text>
          <Text style={styles.desc}>
            Create a room, invite your friends, vote privately on movies and find the perfect choice – together.
          </Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => go('/register')}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}>
            <Text style={styles.btnPrimaryText}>Create account</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/login')}
            style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && styles.pressed]}>
            <Text style={styles.btnOutlineText}>I have an account</Text>
          </Pressable>

          <Pressable
            onPress={() => go('/join-as-guest')}
            style={({ pressed }) => [styles.btn, styles.btnCode, pressed && styles.pressed]}>
            <Ionicons name="grid-outline" size={18} color={Colors.purpleLight} />
            <Text style={styles.btnCodeText}>Join with a code</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  safe: { flex: 1, paddingHorizontal: 24, paddingBottom: 16 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 320, height: 320, opacity: 0.9 },
  textBlock: { alignItems: 'center', gap: 12, marginBottom: 28 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  desc: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 8 },
  actions: { gap: 12 },
  btn: {
    height: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pressed: { opacity: 0.7 },
  btnPrimary: { backgroundColor: Colors.primary },
  btnPrimaryText: { color: '#1A1030', fontSize: 16, fontWeight: '800' },
  btnOutline: { borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.bgElevated },
  btnOutlineText: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  btnCode: { borderWidth: 1.5, borderColor: Colors.purpleLight, backgroundColor: 'rgba(91,43,217,0.15)' },
  btnCodeText: { color: Colors.purpleLight, fontSize: 16, fontWeight: '700' },
});
