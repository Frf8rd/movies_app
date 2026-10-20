import { LinearGradient } from 'expo-linear-gradient';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '@/components/ui/Logo';
import { Colors } from '@/constants/theme';

// Layout comun pentru login / register: zonă colorată sus (logo + titlu) și un card cu formularul dedesubt.
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient
            colors={[Colors.purple, Colors.pink, Colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.hero, { paddingTop: insets.top + 28 }]}>
            {/* cercuri decorative */}
            <View style={[styles.blob, { width: 220, height: 220, top: -70, right: -60 }]} />
            <View style={[styles.blob, { width: 140, height: 140, bottom: 10, left: -50 }]} />
            <Logo size={36} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.sub}>{subtitle}</Text>
          </LinearGradient>

          <View style={styles.card}>{children}</View>
          <View style={styles.footer}>{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 8, paddingBottom: 76, borderBottomLeftRadius: 44, borderBottomRightRadius: 44, overflow: 'hidden' },
  blob: { position: 'absolute', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.10)' },
  title: { color: '#fff', fontSize: 26, fontWeight: '800', marginTop: 18, letterSpacing: -0.4 },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 14 },
  card: {
    marginHorizontal: 20,
    marginTop: -44,
    padding: 20,
    gap: 14,
    borderRadius: 24,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  footer: { alignItems: 'center', marginTop: 22, gap: 4 },
});
