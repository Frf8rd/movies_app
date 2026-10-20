import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  /** arată butonul „ochi" pentru parole */
  password?: boolean;
  invalid?: boolean;
  /** text mic deasupra câmpului */
  label?: string;
};

export function TextField({ icon, password, invalid, label, style, onFocus, onBlur, ...rest }: Props) {
  const [show, setShow] = useState(false);
  const [focused, setFocused] = useState(false);
  const border = invalid ? Colors.danger : focused ? Colors.primary : Colors.border;
  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, { borderColor: border }, focused && styles.focused]}>
        <Ionicons name={icon} size={19} color={focused ? Colors.primary : Colors.textMuted} />
        <TextInput
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
          secureTextEntry={password && !show}
          style={[styles.input, style]}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...rest}
        />
        {password && (
          <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { color: Colors.textMuted, fontSize: 12.5, fontWeight: '700', marginLeft: 4 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 54,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg,
    borderWidth: 1.5,
  },
  focused: { backgroundColor: Colors.bgElevated },
  input: { flex: 1, color: Colors.text, fontSize: 15, height: '100%' },
});
