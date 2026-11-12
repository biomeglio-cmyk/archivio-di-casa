import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { reloadApp } from '@/backup/app-reload';
import { BackupError } from '@/backup/backup-crypto';
import {
  BACKUP_FREQUENCIES,
  getBackupFrequency,
  getSavedBackup,
  saveBackupFrequency,
  saveLastBackupDate,
  setSavedBackup,
  type SavedBackup,
} from '@/backup/backup-layout';
import { createBackup } from '@/backup/create-backup';
import {
  applyRestore,
  discardPickedFile,
  discardPreparedRestore,
  prepareRestore,
  type PreparedRestore,
} from '@/backup/restore-backup';
import { ActionSheet } from '@/components/action-sheet';
import { TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { SecondaryButton } from '@/components/secondary-button';
import { Text } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR, DANGER_COLOR, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { formatBytes } from '@/send/send-preferences';

const MIN_PASSWORD = 8;
// While the key is derived from the password (PBKDF2, slow in pure JS): create and restore
const KEY_LABEL = 'Protezione con la password in corso… può richiedere fino a un minuto';

type Step =
  | { kind: 'idle' }
  | { kind: 'create' } // asking the new password, twice
  | { kind: 'restore'; uri: string; name: string } // asking the password of the chosen file
  | { kind: 'working'; label: string; fraction: number | null }; // null = no percentage yet

const APRICOT_TINT = '#FFF0E7';
const APRICOT = '#F5824A';
const BACKUP_FOLDER = 'Backup'; // in the app's own folder on the phone

function formatBackupDate(date: Date): string {
  return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

// "Backup 11-11-2026"
function backupName(date: Date): string {
  const two = (n: number) => String(n).padStart(2, '0');
  return `Backup ${two(date.getDate())}-${two(date.getMonth() + 1)}-${date.getFullYear()}`;
}

// "oggi alle 16:30", "3 novembre 2026 alle 9:05"
function whenText(iso: string): string {
  const date = new Date(iso);
  const time = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  const day = date.toDateString() === new Date().toDateString() ? 'oggi' : formatBackupDate(date);
  return `${day} alle ${time}`;
}

// The kept backup, if its file is still on the phone
function existingBackup(): SavedBackup | null {
  const saved = getSavedBackup();
  return saved && new File(saved.uri).exists ? saved : null;
}

// "Backup" (docs/design/Backup.dc.html): back, title and "Una copia di tutti i tuoi documenti,
// salvata sul telefono", the card "Non hai ancora fatto un backup" + "Crea backup ora", or
// "Backup completato" with documents, size, time, where the file is and "Copia il file altrove";
// RIPRISTINA ("Scegli un file di backup"); PROMEMORIA ("Ricordami di fare il backup": ogni
// settimana / ogni mese / mai). Our encryption stays: the backup is one file locked with a password
// chosen each time; the newest is kept in Sottomano › Backup (the older one is replaced).
// Fully offline: nothing is sent anywhere by the app.
export default function BackupScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>({ kind: 'idle' });
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(existingBackup);
  const [justCreated, setJustCreated] = useState(false);
  const [frequency, setFrequency] = useState(getBackupFrequency);
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  // From Impostazioni: "Crea un backup ora" starts creating, "Ripristina da un backup" picks a file
  const { action } = useLocalSearchParams<{ action?: 'create' | 'restore' }>();
  const startAction = useEffectEvent(() => {
    if (action === 'create') setStep({ kind: 'create' });
    else if (action === 'restore') pickBackup();
  });
  useEffect(() => {
    if (!action) return;
    const timer = setTimeout(() => startAction(), 500); // after the modal finished sliding up
    return () => clearTimeout(timer);
  }, [action]);

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
      const now = new Date();
      // Kept on the phone in Sottomano › Backup: the new one replaces the previous
      const folder = new Directory(Paths.document, BACKUP_FOLDER);
      if (folder.exists) folder.delete();
      folder.create({ intermediates: true });
      const target = new File(folder, `${backupName(now)}.sottomano`);
      file.move(target);
      const count = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM documents WHERE deleted_at IS NULL');
      const kept: SavedBackup = {
        uri: target.uri,
        name: backupName(now),
        documents: count?.n ?? 0,
        bytes: target.size ?? 0,
        createdAt: now.toISOString(),
      };
      setSavedBackup(kept);
      saveLastBackupDate(now);
      setSaved(kept);
      setJustCreated(true);
      reset();
    } catch (e) {
      reset();
      Alert.alert('Backup non riuscito', e instanceof Error ? e.message : String(e));
    }
  }

  // "Copia il file altrove": the share sheet (Salva su File, iCloud Drive, AirDrop, Mail…)
  async function copyElsewhere() {
    if (!saved) return;
    try {
      await Sharing.shareAsync(saved.uri, {
        mimeType: 'application/octet-stream',
        UTI: 'public.data',
        dialogTitle: 'Copia il backup',
      });
    } catch (e) {
      Alert.alert('Impossibile copiare', e instanceof Error ? e.message : String(e));
    }
  }

  function chooseFrequency(value: typeof frequency) {
    saveBackupFrequency(value);
    setFrequency(value);
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
            style={[styles.track, { backgroundColor: Colors.light.backgroundSelected }]}
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
        <PrimaryButton
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
        <PrimaryButton
          label="Apri backup"
          symbol="lock.open"
          disabled={password.length === 0}
          onPress={() => openBackup(step.uri, step.name)}
        />
        <SecondaryButton label="Annulla" onPress={reset} />
      </View>
    );
  } else {
    const documents = saved ? (saved.documents === 1 ? '1 documento' : `${saved.documents} documenti`) : '';
    body = (
      <>
        {saved ? (
          <WhiteCard style={styles.statusCard}>
            <LinearGradient colors={['#6FD3AE', '#45B68E']} start={GRADIENT_START} end={GRADIENT_END} style={styles.doneCircle}>
              <SymbolView name="checkmark" tintColor="#FFFFFF" size={30} weight="bold" />
            </LinearGradient>
            <Text style={styles.statusTitle}>{justCreated ? 'Backup completato' : 'Ultimo backup'}</Text>
            <Text style={styles.statusText}>{`${documents} · ${formatBytes(saved.bytes)} · ${whenText(saved.createdAt)}`}</Text>
            <View style={styles.path}>
              <SymbolView name="folder" tintColor={Colors.light.indigo} size={18} />
              <Text style={styles.pathText}>{`Sottomano › Backup › ${saved.name}`}</Text>
            </View>
            <SoftButton symbol="square.and.arrow.up" label="Copia il file altrove" onPress={copyElsewhere} />
            <Pressable onPress={() => setStep({ kind: 'create' })} accessibilityRole="button" hitSlop={8} style={styles.again}>
              <Text style={styles.againText}>Crea un nuovo backup</Text>
            </Pressable>
          </WhiteCard>
        ) : (
          <WhiteCard style={styles.statusCard}>
            <View style={styles.idleCircle}>
              <SymbolView name="externaldrive.badge.icloud" tintColor={APRICOT} size={30} />
            </View>
            <Text style={styles.statusTitle}>Non hai ancora fatto un backup</Text>
            <Text style={styles.statusText}>Se perdi o cambi telefono, con il backup ritrovi tutto.</Text>
            <PrimaryButton
              label="Crea backup ora"
              symbol="arrow.down.doc"
              onPress={() => setStep({ kind: 'create' })}
              style={styles.create}
            />
          </WhiteCard>
        )}

        <Text style={styles.section}>Ripristina</Text>
        <WhiteCard style={styles.restoreCard}>
          <Text style={styles.restoreTitle}>Hai cambiato telefono?</Text>
          <Text style={styles.restoreText}>Scegli il file di backup e ritrovi documenti, tessere e promemoria.</Text>
          <SoftButton symbol="arrow.counterclockwise" label="Scegli un file di backup" onPress={pickBackup} plain />
        </WhiteCard>

        <Text style={styles.section}>Promemoria</Text>
        <WhiteCard style={styles.reminder}>
          <View style={styles.reminderIcon}>
            <SymbolView name="bell" tintColor={APRICOT} size={18} />
          </View>
          <Text style={styles.reminderLabel}>Ricordami di fare il backup</Text>
          <Pressable
            onPress={() => setFrequencyOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={`Ricordami di fare il backup: ${BACKUP_FREQUENCIES.find((f) => f.value === frequency)?.label}`}
            style={styles.select}>
            <Text style={styles.selectText}>{BACKUP_FREQUENCIES.find((f) => f.value === frequency)?.label}</Text>
            <SymbolView name="chevron.down" tintColor={Colors.light.textSecondary} size={12} weight="semibold" />
          </Pressable>
        </WhiteCard>
        <Text style={styles.footnote}>
          Il backup è un unico file protetto dalla password che scegli: documenti, foto, tessere, persone e promemoria.
          Copialo altrove (File, iCloud Drive, un computer) per ritrovarlo anche se perdi il telefono.
        </Text>
      </>
    );
  }

  return (
    <>
      {/* No swipe-down while working: the sheet must stay open until the end */}
      <Stack.Screen options={{ gestureEnabled: !working }} />
      <ScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[styles.content, { paddingTop: 24, paddingBottom: insets.bottom + 40 }]}>
        <View>
          {!working && (
            <RoundIconButton
              symbol="chevron.left"
              accessibilityLabel="Indietro"
              color={Colors.light.text}
              onPress={() => (step.kind === 'idle' ? router.back() : reset())}
            />
          )}
          <Text style={styles.title} accessibilityRole="header">
            Backup
          </Text>
          <Text style={styles.subtitle}>Una copia di tutti i tuoi documenti, salvata sul telefono.</Text>
        </View>
        {body}
      </ScrollView>

      <ActionSheet
        visible={frequencyOpen}
        title="Ricordami di fare il backup"
        actions={BACKUP_FREQUENCIES.map((f) => ({
          key: f.value,
          label: f.label,
          symbol: f.value === frequency ? 'checkmark.circle.fill' : 'circle',
          onPress: () => chooseFrequency(f.value),
        }))}
        onClose={() => setFrequencyOpen(false)}
      />
    </>
  );
}

// Lilac full-width button of the design ("Copia il file altrove", "Scegli un file di backup")
function SoftButton({ symbol, label, onPress, plain = false }: { symbol: SFSymbol; label: string; onPress: () => void; plain?: boolean }) {
  const color = plain ? Colors.light.text : Colors.light.indigo;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.soft, pressed && styles.pressed]}>
      <SymbolView name={symbol} tintColor={color} size={18} weight="semibold" />
      <Text style={[styles.softText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: Spacing.side,
    gap: 20,
  },
  title: {
    marginTop: 22,
    fontSize: 30,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  statusCard: {
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  idleCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: APRICOT_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 20px rgba(69, 182, 142, 0.30)',
  },
  statusTitle: {
    marginTop: 14,
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
    textAlign: 'center',
  },
  create: {
    marginTop: 18,
    alignSelf: 'stretch',
  },
  path: {
    marginTop: 14,
    alignSelf: 'stretch',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: Colors.light.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pathText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.medium,
    color: Colors.light.textOnLilac,
  },
  soft: {
    marginTop: 14,
    alignSelf: 'stretch',
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.light.lilac,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  softText: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  pressed: {
    opacity: 0.7,
  },
  again: {
    marginTop: 12,
  },
  againText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.light.accent,
  },
  section: {
    marginBottom: -10,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  restoreCard: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  restoreTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  restoreText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  reminder: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: APRICOT_TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  select: {
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.light.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: Colors.light.text,
  },
  footnote: {
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
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
