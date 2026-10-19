import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps, View } from 'react-native';

import { Colors, Radius } from '@/constants/theme';

type Props = TextInputProps & {
  icon: keyof typeof Ionicons.glyphMap;
  /** arată butonul „ochi" pentru parole */
  password?: boolean;
  invalid?: boolean;
};

export function TextField({ icon, password, invalid, style, ...rest }: Props) {
  const [show, setShow] = useState(false);
  return (
    <View style={[styles.field, invalid && { borderColor: Colors.danger }]}>
      <Ionicons name={icon} size={18} color={Colors.textMuted} />
      <TextInput
        placeholderTextColor={Colors.textMuted}
        autoCapitalize="none"
        secureTextEntry={password && !show}
        style={[styles.input, style]}
        {...rest}
      />
      {password && (
        <Pressable onPress={() => setShow((v) => !v)} hitSlop={8}>
          <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.bgElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  input: { flex: 1, color: Colors.text, fontSize: 15 },
});
