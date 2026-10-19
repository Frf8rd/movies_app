import { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

export const CODE_LENGTH = 6;

/** majuscule, doar litere/cifre, max 6 caractere */
export const cleanCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH);

/** K7F29Q -> K7F-29Q (formatul din README) */
export const formatCode = (c: string) => (c.length > 3 ? `${c.slice(0, 3)}-${c.slice(3)}` : c);

type Props = { value: string; onChange: (code: string) => void; onComplete?: () => void; autoFocus?: boolean };

// 6 căsuțe + un TextInput invizibil care primește tastatura. Reutilizabil și în /room/join.
export function CodeInput({ value, onChange, onComplete, autoFocus }: Props) {
  const ref = useRef<TextInput>(null);

  const box = (i: number) => {
    const active = value.length === i || (value.length === CODE_LENGTH && i === CODE_LENGTH - 1);
    return (
      <View key={i} style={[styles.box, active && styles.boxActive, !!value[i] && styles.boxFilled]}>
        <Text style={styles.char}>{value[i] ?? ''}</Text>
      </View>
    );
  };

  return (
    <Pressable onPress={() => ref.current?.focus()} style={styles.row}>
      {[0, 1, 2].map(box)}
      <Text style={styles.dash}>-</Text>
      {[3, 4, 5].map(box)}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => {
          const c = cleanCode(t);
          onChange(c);
          if (c.length === CODE_LENGTH) onComplete?.();
        }}
        autoFocus={autoFocus}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={CODE_LENGTH + 1}
        style={styles.hidden}
        caretHidden
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  box: {
    width: 44,
    height: 56,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: Colors.primary },
  boxFilled: { borderColor: Colors.purpleLight },
  char: { color: Colors.text, fontSize: 24, fontWeight: '800' },
  dash: { color: Colors.textMuted, fontSize: 22, fontWeight: '800' },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
