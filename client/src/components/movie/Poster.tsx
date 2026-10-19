import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

const PALETTES: [string, string][] = [
  ['#5B2BD9', '#FF2D6F'], ['#0F6B7A', '#5B2BD9'], ['#FF8A1F', '#E5173F'], ['#2B3A8F', '#7A4DFF'], ['#E5173F', '#3B1FA8'],
];

// Poster real dacă există URL, altfel un gradient cu titlul (ca să nu rămână găuri în UI).
export function Poster({ uri, title, id, style }: { uri?: string | null; title?: string; id?: string | number; style?: StyleProp<ViewStyle> }) {
  if (uri) return <Image source={{ uri }} style={[styles.fill, style as any]} contentFit="cover" transition={150} />;
  const seed = Number(String(id ?? title ?? 0).replace(/\D/g, '')) || (title ?? '').length;
  return (
    <LinearGradient colors={PALETTES[seed % PALETTES.length]} style={[styles.fill, styles.center, style]}>
      <Text style={styles.text} numberOfLines={4}>{title}</Text>
    </LinearGradient>
  );
}

export const PosterBox = ({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ backgroundColor: Colors.card, overflow: 'hidden' }, style]}>{children}</View>
);

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%' },
  center: { alignItems: 'center', justifyContent: 'center', padding: 8 },
  text: { color: '#fff', fontWeight: '800', fontSize: 14, textAlign: 'center' },
});
