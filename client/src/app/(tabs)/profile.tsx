import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/store/auth';

// Provizoriu: doar datele de bază + logout (restul paginii de profil urmează).
export default function ProfileScreen() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);

  return (
    <SafeAreaView style={styles.safe}>
      <Avatar uri={user?.avatarUrl} name={user?.name} size={72} />
      <Text style={styles.name}>{user?.name || 'Profil'}</Text>
      {!!user?.email && <Text style={styles.email}>{user.email}</Text>}
      <Pressable onPress={logout} style={styles.btn}>
        <Text style={styles.btnText}>Log out</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center', gap: 8 },
  name: { color: Colors.text, fontSize: 20, fontWeight: '800', marginTop: 8 },
  email: { color: Colors.textMuted },
  btn: { marginTop: 20, borderWidth: 1, borderColor: Colors.danger, paddingHorizontal: 28, paddingVertical: 10, borderRadius: 12 },
  btnText: { color: Colors.danger, fontWeight: '700' },
});
