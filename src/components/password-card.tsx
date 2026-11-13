import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Alert, AppState, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { authenticate } from '@/security/app-lock';
import { readPassword } from '@/security/password-vault';
import { type Palette } from '@/constants/theme';

const CLIPBOARD_SECONDS = 60;

type Props = {
  documentId: number;
  username: string | null;
};

// "Utente" and "Password" of a document in the Password category. The password stays masked
// (••••••••); "Mostra" and "Copia" first ask Face ID or the iPhone passcode, then read it from
// the Keychain. It is hidden again when the app goes to the background. The copied value stays
// on this iPhone only (no Universal Clipboard) and iOS removes it from the clipboard after 60 s.
export function PasswordCard({ documentId, username }: Props) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') setShown(null);
    });
    return () => subscription.remove();
  }, []);

  async function unlockedPassword(reason: string): Promise<string | null> {
    if (!(await authenticate(reason))) return null;
    const value = await readPassword(documentId);
    if (value === null) Alert.alert('Nessuna password', 'Aggiungila con Modifica.');
    return value;
  }

  async function toggleShow() {
    if (shown !== null) {
      setShown(null);
      return;
    }
    setShown(await unlockedPassword('Mostra la password'));
  }

  async function copy() {
    const value = await unlockedPassword('Copia la password');
    if (value === null) return;
    await Clipboard.setStringAsync(value, {
      ios: { localOnly: true, expiresAt: new Date(Date.now() + CLIPBOARD_SECONDS * 1000) },
    });
    Alert.alert('Password copiata', 'Sparisce dagli appunti tra 1 minuto.');
  }

  const line = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected };

  return (
    <WhiteCard style={styles.card}>
      <View style={styles.row}>
        <ThemedText themeColor="textSecondary">Utente</ThemedText>
        <ThemedText style={styles.value} selectable>
          {username ?? '—'}
        </ThemedText>
      </View>
      <View style={[styles.row, line]}>
        <ThemedText themeColor="textSecondary">Password</ThemedText>
        <ThemedText
          style={[styles.value, styles.password]}
          accessibilityLabel={shown === null ? 'Password nascosta' : shown}>
          {shown ?? '••••••••'}
        </ThemedText>
      </View>
      <View style={[styles.actions, line]}>
        <Pressable onPress={toggleShow} accessibilityRole="button" hitSlop={6} style={styles.action}>
          <Text style={styles.actionText}>{shown === null ? 'Mostra' : 'Nascondi'}</Text>
        </Pressable>
        <Pressable onPress={copy} accessibilityRole="button" hitSlop={6} style={styles.action}>
          <Text style={styles.actionText}>Copia</Text>
        </Pressable>
      </View>
    </WhiteCard>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 14,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
  password: {
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 24,
    paddingVertical: 6,
  },
  action: {
    minHeight: 44,
    justifyContent: 'center',
  },
  actionText: {
    color: BRAND_COLOR(c),
    fontSize: 17,
  },
});
