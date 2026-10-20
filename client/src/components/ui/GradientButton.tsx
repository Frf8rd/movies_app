import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/theme';

export function GradientButton({ label, onPress, loading, disabled }: { label: string; onPress: () => void; loading?: boolean; disabled?: boolean }) {
  const off = disabled || loading;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={off} style={({ pressed }) => [styles.wrap, (off || pressed) && { opacity: 0.65 }]}>
      <LinearGradient colors={[Colors.primary, Colors.pink]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.btn}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{label}</Text>}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 16, marginTop: 6 },
  btn: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
});
