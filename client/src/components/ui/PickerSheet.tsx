import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export type PickerOption = { value: string | number | null; label: string };

type Props = {
  visible: boolean;
  title: string;
  options: PickerOption[];
  selected: (string | number | null)[];
  /** multi = bifezi mai multe și apeși „Done"; single = alegi unul și se închide */
  multi?: boolean;
  onChange: (selected: (string | number | null)[]) => void;
  onClose: () => void;
  emptyMessage?: string;
};

// Foaie de jos pentru alegerea valorilor (gen, durată, platforme, an, rating).
export function PickerSheet({ visible, title, options, selected, multi, onChange, onClose, emptyMessage }: Props) {
  const toggle = (v: string | number | null) => {
    if (!multi) {
      onChange([v]);
      onClose();
      return;
    }
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.done}>{multi ? 'Done' : 'Close'}</Text>
          </Pressable>
        </View>
        <ScrollView style={{ maxHeight: 380 }}>
          {options.length === 0 && <Text style={styles.empty}>{emptyMessage ?? 'Nu sunt opțiuni disponibile.'}</Text>}
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <Pressable key={String(o.value)} onPress={() => toggle(o.value)} style={styles.row}>
                <Text style={[styles.label, on && { color: Colors.primary }]}>{o.label}</Text>
                {on && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  done: { color: Colors.primary, fontSize: 15, fontWeight: '800' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.border },
  label: { color: Colors.text, fontSize: 15 },
  empty: { color: Colors.textMuted, textAlign: 'center', paddingVertical: 24 },
});
