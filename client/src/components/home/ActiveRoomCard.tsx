import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';
import type { Room, RoomStatus } from '@/types/models';

const STATUS_LABEL: Record<RoomStatus, string> = {
  LOBBY: 'În lobby',
  VOTING: 'Se votează',
  RESULTS: 'Rezultate gata',
  CLOSED: 'Închisă',
};

export function ActiveRoomCard({ room, onPress }: { room: Room; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.icon}>
        <Ionicons name="people" size={20} color={Colors.primary} />
      </View>
      <View style={styles.texts}>
        <Text style={styles.title} numberOfLines={1}>
          {room.title || 'Cameră activă'}
        </Text>
        <Text style={styles.sub}>
          {room.code} · {room.membersCount} participanți · {STATUS_LABEL[room.status]}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  icon: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,138,31,0.14)', alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, gap: 2 },
  title: { color: Colors.text, fontWeight: '700', fontSize: 15 },
  sub: { color: Colors.textMuted, fontSize: 12 },
});
