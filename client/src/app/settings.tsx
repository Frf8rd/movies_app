import { Ionicons } from '@expo/vector-icons';
import { Href, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TextField } from '@/components/ui/TextField';
import { Colors, Radius } from '@/constants/theme';
import { logoutRemote } from '@/services/auth';
import { changePassword, deleteAccount, updateMe } from '@/services/me';
import { useAuth } from '@/store/auth';

const NOTIF_KEY = 'rm_notifications';

export default function SettingsScreen() {
  const user = useAuth((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingName, setSavingName] = useState(false);

  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [notif, setNotif] = useState(true);
  useEffect(() => {
    SecureStore.getItemAsync(NOTIF_KEY).then((v) => v !== null && setNotif(v === '1')).catch(() => {});
  }, []);
  const toggleNotif = (v: boolean) => {
    setNotif(v);
    SecureStore.setItemAsync(NOTIF_KEY, v ? '1' : '0').catch(() => {});
    // TODO push: când backend-ul are endpoint pentru tokenul de notificări, înregistrează/șterge tokenul aici
  };

  const saveName = async () => {
    setNameMsg(null);
    if (name.trim().length < 2) return setNameMsg({ ok: false, text: 'Numele e prea scurt.' });
    setSavingName(true);
    try { await updateMe(name.trim()); setNameMsg({ ok: true, text: 'Saved.' }); } catch (e) { setNameMsg({ ok: false, text: (e as Error).message }); } finally { setSavingName(false); }
  };

  const savePw = async () => {
    setPwMsg(null);
    if (!oldPw) return setPwMsg({ ok: false, text: 'Introdu parola actuală.' });
    if (newPw.length < 8) return setPwMsg({ ok: false, text: 'Parola nouă: minim 8 caractere.' });
    setSavingPw(true);
    try { await changePassword(oldPw, newPw); setOldPw(''); setNewPw(''); setPwMsg({ ok: true, text: 'Password changed.' }); } catch (e) { setPwMsg({ ok: false, text: (e as Error).message }); } finally { setSavingPw(false); }
  };

  const onDelete = () =>
    Alert.alert('Delete account?', 'Your account and all your data will be permanently deleted. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: () => deleteAccount().catch((e) => Alert.alert('Error', (e as Error).message)) },
    ]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="arrow-back" size={24} color={Colors.text} /></Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>Profile</Text>
        <TextField icon="person-outline" placeholder="Name" value={name} onChangeText={setName} autoCapitalize="words" />
        <Msg m={nameMsg} />
        <Btn label="Save name" loading={savingName} onPress={saveName} />
        <Text style={styles.note}>Profile photo upload will be added later.</Text>

        <Text style={styles.section}>Preferences</Text>
        <Pressable onPress={() => router.push('/onboarding' as Href)} style={styles.row}>
          <Ionicons name="options-outline" size={20} color={Colors.text} />
          <Text style={styles.rowText}>Genres & platforms</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
        </Pressable>
        <View style={styles.row}>
          <Ionicons name="notifications-outline" size={20} color={Colors.text} />
          <Text style={styles.rowText}>Notifications</Text>
          <Switch value={notif} onValueChange={toggleNotif} trackColor={{ true: Colors.primary, false: Colors.border }} />
        </View>

        <Text style={styles.section}>Change password</Text>
        <TextField icon="lock-closed-outline" placeholder="Current password" value={oldPw} onChangeText={setOldPw} password />
        <TextField icon="key-outline" placeholder="New password" value={newPw} onChangeText={setNewPw} password />
        <Msg m={pwMsg} />
        <Btn label="Change password" loading={savingPw} onPress={savePw} />

        <Text style={styles.section}>Account</Text>
        <Pressable onPress={logoutRemote} style={styles.outline}><Text style={styles.outlineText}>Log out</Text></Pressable>
        <Pressable onPress={onDelete} style={[styles.outline, { borderColor: Colors.danger }]}><Text style={[styles.outlineText, { color: Colors.danger }]}>Delete account</Text></Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const Msg = ({ m }: { m: { ok: boolean; text: string } | null }) =>
  m ? <Text style={{ color: m.ok ? '#22D3C5' : Colors.danger, fontSize: 13 }}>{m.text}</Text> : null;

const Btn = ({ label, loading, onPress }: { label: string; loading: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [styles.btn, (loading || pressed) && { opacity: 0.6 }]}>
    {loading ? <ActivityIndicator color="#1A1030" /> : <Text style={styles.btnText}>{label}</Text>}
  </Pressable>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 52, paddingHorizontal: 20 },
  title: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  section: { color: Colors.text, fontSize: 16, fontWeight: '800', marginTop: 12 },
  note: { color: Colors.textMuted, fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, paddingHorizontal: 14, borderRadius: Radius.md, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border },
  rowText: { flex: 1, color: Colors.text, fontWeight: '700', fontSize: 14 },
  btn: { height: 48, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#1A1030', fontWeight: '800', fontSize: 15 },
  outline: { height: 50, borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: Colors.text, fontWeight: '800', fontSize: 15 },
});
