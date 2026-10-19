import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
  gradient: readonly [string, string];
  iconBg: string;
  buttonBg: string;
  buttonColor: string;
};

export function ActionCard({ icon, title, subtitle, buttonLabel, onPress, gradient, iconBg, buttonBg, buttonColor }: Props) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.icon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={26} color="#fff" />
        </View>
        <View style={styles.texts}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{subtitle}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.btn, { backgroundColor: buttonBg, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={[styles.btnText, { color: buttonColor }]}>{buttonLabel}</Text>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: Radius.lg, padding: 16, gap: 14 },
  top: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  sub: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, lineHeight: 17 },
  btn: { height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '800' },
});
