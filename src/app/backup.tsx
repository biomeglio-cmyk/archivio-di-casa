import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';

import { reloadApp } from '@/backup/app-reload';
import { BackupError } from '@/backup/backup-crypto';
import { getLastBackupDate, saveLastBackupDate } from '@/backup/backup-layout';
import { createBackup } from '@/backup/create-backup';
import {
  applyRestore,
  discardPickedFile,
  discardPreparedRestore,
  prepareRestore,
  type PreparedRestore,
} from '@/backup/restore-backup';
import { TextField } from '@/components/form-field';
import { GradientButton } from '@/components/gradient-button';
import { Group, Row } from '@/components/grouped-list';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

const MIN_PASSWORD = 8;
// While the key is derived from the password (PBKDF2, slow in pure JS): create and restore
const KEY_LABEL = 'Protezione con la password in corso… può richiedere fino a un minuto';

type Step =
  | { kind: 'idle' }
  | { kind: 'create' } // asking the new password, twice
  | { kind: 'restore'; uri: string; name: string } // asking the password of the chosen file
  | { kind: 'working'; label: string; fraction: number | null }; // null = no percentage yet

function formatBackupDate(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "Backup" (Menu › Impostazioni): one encrypted .sottomano file with the database and every photo,
// to keep in Files, iCloud Drive, a Mac… Fully offline: nothing is sent anywhere by the app.
export default function BackupScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastBackup, setLastBackup] = useState(getLastBackupDate);

  const working = step.kind === 'working';

  function reset() {
    if (step.kind === 'restore') discardPickedFile(step.uri);
    setStep({ kind: 'idle' });
    setPassword('');
    setRepeat('');
    setError(null);
  }

  function progress(label: string, fraction: number | null) {
    setStep({ kind: 'working', label, fraction });
  }

  // ——— Crea backup ———

  const passwordProblem =
    password.length < MIN_PASSWORD
      ? `Almeno ${MIN_PASSWORD} caratteri.`
      : repeat.length > 0 && repeat !== password
        ? 'Le due password non coincidono.'
        : null;

  async function create() {
    const chosen = password;
    progress(KEY_LABEL, null);
    try {
      const file = await createBackup(db, chosen, (p) =>
        p.phase === 'key'
          ? progress(KEY_LABEL, null)
          : progress('Creo il backup…', p.total > 0 ? p.done / p.total : null),
      );
      reset();
      const now = new Date();
      saveLastBackupDate(now);
      setLastBackup(now);
      try {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/octet-stream',
          UTI: 'public.data',
          dialogTitle: 'Salva il backup',
        });
      } finally {
        file.delete(); // only the copy the user saved remains
      }
    } catch (e) {
      reset();
      Alert.alert('Backup non riuscito', e instanceof Error ? e.message : String(e));
    }
  }

  // ——— Ripristina backup ———

  async function pickBackup() {
    const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || result.assets.length === 0) return;
    const asset = result.assets[0];
    setError(null);
    setPassword('');
    setStep({ kind: 'restore', uri: asset.uri, name: asset.name });
  }

  async function openBackup(uri: string, name: string) {
    const typed = password;
    progress(KEY_LABEL, null);
    let prepared;
    try {
      prepared = await prepareRestore(uri, typed, (p) => {
        if (p.phase === 'key') progress(KEY_LABEL, null);
        else if (p.phase === 'decrypt') progress('Apro il backup…', p.done / p.total);
        else progress('Controllo i documenti…', p.total > 0 ? p.done / p.total : null);
      });
    } catch (e) {
      // Nothing of the current data was touched: back to the password, with the reason
      setStep({ kind: 'restore', uri, name });
      setError(e instanceof Error ? e.message : String(e));
      if (e instanceof BackupError && e.kind !== 'wrong-password') setPassword('');
      return;
    }

    const date = formatBackupDate(new Date(prepared.manifest.createdAt));
    const count = prepared.documentCount === 1 ? '1 documento' : `${prepared.documentCount} documenti`;
    Alert.alert(`Ripristinare il backup del ${date}?`, `Contiene ${count}. Il contenuto attuale verrà sostituito.`, [
      {
        text: 'Annulla',
        style: 'cancel',
        onPress: () => {
          discardPreparedRestore();
          discardPickedFile(uri);
          reset();
        },
      },
      { text: 'Ripristina', style: 'destructive', onPress: () => restore(uri, prepared) },
    ]);
  }

  async function restore(uri: string, prepared: PreparedRestore) {
    progress('Ripristino…', null);
    try {
      await applyRestore(db, prepared);
    } catch (e) {
      discardPickedFile(uri);
      reset();
      Alert.alert('Ripristino non riuscito', `Il contenuto attuale è rimasto com'era.\n\n${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    discardPickedFile(uri);
    // Close the sheets, then rebuild every screen from the restored data (back on Home)
    Alert.alert('Backup ripristinato', 'I tuoi documenti sono tornati.', [
      {
        text: 'OK',
        onPress: () => {
          if (router.canDismiss()) router.dismissAll();
          reloadApp();
        },
      },
    ]);
  }

  // ——— Screen ———

  let body;
  if (step.kind === 'working') {
    body = (
      <View style={styles.working}>
        <ActivityIndicator size="large" color={BRAND_COLOR} />
        <ThemedText type="smallBold" style={styles.center}>
          {step.label}
        </ThemedText>
        {step.fraction !== null && (
          <View
            style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(step.fraction * 100) }}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round(step.fraction * 100))}%` }]} />
          </View>
        )}
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          Tieni aperta l&apos;app finché non ha finito.
        </ThemedText>
      </View>
    );
  } else if (step.kind === 'create') {
    body = (
      <View style={styles.form}>
        <ThemedText style={styles.warning}>Se dimentichi la password, il backup non si può aprire.</ThemedText>
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder="Password (almeno 8 caratteri)"
          secureTextEntry
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <TextField
          value={repeat}
          onChangeText={setRepeat}
          placeholder="Ripeti la password"
          secureTextEntry
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {password.length > 0 && passwordProblem && (
          <ThemedText type="small" themeColor="textSecondary">
            {passwordProblem}
          </ThemedText>
        )}
        <GradientButton
          label="Crea e salva"
          symbol="lock.doc"
          disabled={passwordProblem !== null || repeat !== password}
          onPress={create}
        />
        <SecondaryButton label="Annulla" onPress={reset} />
      </View>
    );
  } else if (step.kind === 'restore') {
    body = (
      <View style={styles.form}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {step.name}
        </ThemedText>
        <TextField
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder="Password del backup"
          secureTextEntry
          textContentType="password"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={() => password.length > 0 && openBackup(step.uri, step.name)}
        />
        {error && <ThemedText style={{ color: DANGER_COLOR }}>{error}</ThemedText>}
        <GradientButton
          label="Apri backup"
          symbol="lock.open"
          disabled={password.length === 0}
          onPress={() => openBackup(step.uri, step.name)}
        />
        <SecondaryButton label="Annulla" onPress={reset} />
      </View>
    );
  } else {
    body = (
      <>
        <Group
          title="Backup"
          footer="Un unico file cifrato con la tua password: documenti, foto e persone. Salvalo in File, iCloud Drive o su un computer. Le impostazioni restano su questo iPhone.">
          <Row
            label="Ultimo backup"
            symbol="clock.arrow.circlepath"
            value={lastBackup ? formatBackupDate(lastBackup) : 'Mai'}
            first
          />
        </Group>
        <View style={styles.buttons}>
          <GradientButton label="Crea backup" symbol="lock.doc" onPress={() => setStep({ kind: 'create' })} />
          <SecondaryButton label="Ripristina backup" symbol="arrow.counterclockwise" onPress={pickBackup} />
        </View>
      </>
    );
  }

  return (
    <>
      {/* No swipe-down while working: the sheet must stay open until the end */}
      <Stack.Screen options={{ gestureEnabled: !working }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        {body}
      </ScrollView>

      {!working && (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
            Fine
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
  buttons: {
    gap: 12,
  },
  form: {
    gap: 12,
  },
  warning: {
    color: DANGER_COLOR,
    fontWeight: 600,
  },
  working: {
    alignItems: 'center',
    gap: 16,
    paddingTop: 48,
  },
  center: {
    textAlign: 'center',
  },
  track: {
    alignSelf: 'stretch',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: BRAND_COLOR,
  },
});
