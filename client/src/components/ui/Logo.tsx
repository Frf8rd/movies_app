import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[Colors.pink, Colors.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.badge, { width: size + 6, height: size + 6, borderRadius: (size + 6) / 2 }]}>
        <Ionicons name="film" size={size * 0.6} color="#fff" />
      </LinearGradient>
      <Text style={[styles.word, { fontSize: size * 0.8 }]}>
        Reel<Text style={{ color: Colors.pink }}>Match</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { alignItems: 'center', justifyContent: 'center' },
  word: { color: Colors.text, fontWeight: '800', letterSpacing: -0.3 },
});
