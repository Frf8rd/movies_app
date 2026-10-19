import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

type Props = { uri?: string | null; name?: string; size?: number };

export function Avatar({ uri, name = '', size = 36 }: Props) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (uri) return <Image source={{ uri }} style={[styles.img, box]} contentFit="cover" />;
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View style={[styles.fallback, box]}>
      <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { borderWidth: 2, borderColor: Colors.pink },
  fallback: {
    backgroundColor: Colors.purple,
    borderWidth: 2,
    borderColor: Colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { color: '#fff', fontWeight: '700' },
});
