import { Image, Pressable, StyleSheet, Text } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Provider } from '@/types/models';

export function ProviderTile({ provider, selected, onPress }: { provider: Provider; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.tile, selected && styles.on, pressed && { opacity: 0.7 }]}>
      {provider.logoUrl ? (
        <Image source={{ uri: provider.logoUrl }} style={styles.logo} resizeMode="contain" />
      ) : null}
      <Text style={styles.name} numberOfLines={1}>{provider.name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: '31.5%',
    height: 76,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 6,
  },
  on: { borderColor: Colors.primary, backgroundColor: 'rgba(255,138,31,0.12)' },
  logo: { width: 34, height: 34, borderRadius: 8 },
  name: { color: Colors.text, fontSize: 11, fontWeight: '700' },
});
