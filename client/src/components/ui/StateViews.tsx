import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/theme';

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
      <Text style={styles.msg}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retry}>
          <Text style={styles.retryText}>Reîncearcă</Text>
        </Pressable>
      )}
    </View>
  );
}

export function EmptyState({ icon = 'film-outline', message }: { icon?: keyof typeof Ionicons.glyphMap; message: string }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={28} color={Colors.textMuted} />
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 16 },
  msg: { color: Colors.textMuted, textAlign: 'center', fontSize: 13 },
  retry: { borderColor: Colors.primary, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  retryText: { color: Colors.primary, fontWeight: '700' },
});
