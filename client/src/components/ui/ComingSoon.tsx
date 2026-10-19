import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export function ComingSoon({ title, back = false }: { title: string; back?: boolean }) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.box}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Acest ecran urmează.</Text>
        {back && (
          <Pressable onPress={() => router.back()} style={styles.btn}>
            <Text style={styles.btnText}>Înapoi</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  box: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
  sub: { color: Colors.textMuted },
  btn: { marginTop: 12, backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: '#1A1030', fontWeight: '800' },
});
