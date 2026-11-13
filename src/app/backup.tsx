import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as Sharing from 'expo-sharing';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useEffect, useEffectEvent, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { announce } from '@/a11y/accessibility';
import { reloadApp } from '@/backup/app-reload';
import { BackupError } from '@/backup/backup-crypto';
import {
  BACKUP_FREQUENCIES,
  backupFrequencyLabel,
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
import { NoBreakText } from '@/components/tile-title';
import { TextField } from '@/components/form-field';
import { PrimaryButton } from '@/components/primary-button';
import { RoundIconButton } from '@/components/round-icon-button';
import { SecondaryButton } from '@/components/secondary-button';
import { Text } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR, DANGER_COLOR, GRADIENT_END, GRADIENT_START } from '@/constants/brand';
import { type Palette, softTint, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { formatBytes } from '@/send/send-preferences';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { t, useI18n } from '@/i18n';
import { intlLocale } from '@/i18n/format';

const MIN_PASSWORD = 8;
// While the key is derived from the password (PBKDF2, slow in pure JS): create and restore
const keyLabel = () => t('backup.keyProgress');

type Step =
  | { kind: 'idle' }
  | { kind: 'create' } // asking the new password, twice
  | { kind: 'restore'; uri: string; name: string } // asking the password of the chosen file
  | { kind: 'working'; label: string; fraction: number | null }; // null = no percentage yet

const APRICOT_TINT = (p: Palette) => softTint(p, '#FFF0E7', '#2A1E24');
const APRICOT = '#F5824A';
const BACKUP_FOLDER = 'Backup'; // in the app's own folder on the phone

function formatBackupDate(date: Date): string {
  return date.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
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
  return date.toDateString() === new Date().toDateString()
    ? t('backup.whenToday', { time })
    : t('backup.whenDate', { date: formatBackupDate(date), time });
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
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const large = useWindowDimensions().fontScale > 1.3; // larger text: rows stack, names wrap
  const { t } = useI18n();
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

  // VoiceOver: each phase of the work ("Protezione con la password…", "Creazione…", "Ripristino…")
  const workingLabel = step.kind === 'working' ? step.label : null;
  useEffect(() => {
    announce(workingLabel);
  }, [workingLabel]);

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
      ? t('backup.minLength', { min: MIN_PASSWORD })
      : repeat.length > 0 && repeat !== password
        ? t('backup.mismatch')
        : null;

  async function create() {
    const chosen = password;
    progress(keyLabel(), null);
    try {
      const file = await createBackup(db, chosen, (p) =>
        p.phase === 'key'
          ? progress(keyLabel(), null)
          : progress(t('backup.creating'), p.total > 0 ? p.done / p.total : null),
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
      announce(t('backup.completed'));
    } catch (e) {
      reset();
      Alert.alert(t('backup.alerts.createFailed'), e instanceof Error ? e.message : String(e));
    }
  }

  // "Copia il file altrove": the share sheet (Salva su File, iCloud Drive, AirDrop, Mail…)
  async function copyElsewhere() {
    if (!saved) return;
    try {
      await Sharing.shareAsync(saved.uri, {
        mimeType: 'application/octet-stream',
        UTI: 'public.data',
        dialogTitle: t('backup.copyDialogTitle'),
      });
    } catch (e) {
      Alert.alert(t('backup.alerts.copyFailed'), e instanceof Error ? e.message : String(e));
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
    progress(keyLabel(), null);
    let prepared;
    try {
      prepared = await prepareRestore(uri, typed, (p) => {
        if (p.phase === 'key') progress(keyLabel(), null);
        else if (p.phase === 'decrypt') progress(t('backup.opening'), p.done / p.total);
        else progress(t('backup.checking'), p.total > 0 ? p.done / p.total : null);
      });
    } catch (e) {
      // Nothing of the current data was touched: back to the password, with the reason
      const reason = e instanceof Error ? e.message : String(e);
      setStep({ kind: 'restore', uri, name });
      setError(reason);
      announce(reason);
      if (e instanceof BackupError && e.kind !== 'wrong-password') setPassword('');
      return;
    }

    const date = formatBackupDate(new Date(prepared.manifest.createdAt));
    Alert.alert(
      t('backup.alerts.restoreTitle', { date }),
      t('backup.alerts.restoreMessage', { count: prepared.documentCount }),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
          onPress: () => {
            discardPreparedRestore();
            discardPickedFile(uri);
            reset();
          },
        },
        { text: t('common.restore'), style: 'destructive', onPress: () => restore(uri, prepared) },
      ],
    );
  }

  async function restore(uri: string, prepared: PreparedRestore) {
    progress(t('backup.restoring'), null);
    try {
      await applyRestore(db, prepared);
    } catch (e) {
      discardPickedFile(uri);
      reset();
      Alert.alert(
        t('backup.alerts.restoreFailed'),
        t('backup.alerts.restoreFailedMessage', { reason: e instanceof Error ? e.message : String(e) }),
      );
      return;
    }
    discardPickedFile(uri);
    // Close the sheets, then rebuild every screen from the restored data (back on Home)
    Alert.alert(t('backup.alerts.restored'), t('backup.alerts.restoredMessage'), [
      {
        text: t('common.ok'),
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
        <ActivityIndicator size="large" color={BRAND_COLOR(theme)} />
        <ThemedText type="smallBold" style={styles.center}>
          {step.label}
        </ThemedText>
        {step.fraction !== null && (
          <View
            style={[styles.track, { backgroundColor: theme.backgroundSelected }]}
            accessible
            accessibilityLabel={step.label}
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 0, max: 100, now: Math.round(step.fraction * 100) }}>
            <View style={[styles.fill, { width: `${Math.min(100, Math.round(step.fraction * 100))}%` }]} />
          </View>
        )}
        <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
          {t('backup.keepOpen')}
        </ThemedText>
      </View>
    );
  } else if (step.kind === 'create') {
    body = (
      <View style={styles.form}>
        <ThemedText style={styles.warning}>{t('backup.forgotWarning')}</ThemedText>
        <TextField
          value={password}
          onChangeText={setPassword}
          placeholder={t('backup.passwordPlaceholder', { min: MIN_PASSWORD })}
          accessibilityLabel={t('backup.passwordPlaceholder', { min: MIN_PASSWORD })}
          secureTextEntry
          textContentType="newPassword"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
        />
        <TextField
          value={repeat}
          onChangeText={setRepeat}
          placeholder={t('backup.repeatPlaceholder')}
          accessibilityLabel={t('backup.repeatPlaceholder')}
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
          label={t('backup.createAndSave')}
          symbol="lock.doc"
          disabled={passwordProblem !== null || repeat !== password}
          onPress={create}
        />
        <SecondaryButton label={t('common.cancel')} onPress={reset} />
      </View>
    );
  } else if (step.kind === 'restore') {
    body = (
      <View style={styles.form}>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={large ? undefined : 2}>
          {step.name}
        </ThemedText>
        <TextField
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setError(null);
          }}
          placeholder={t('backup.backupPassword')}
          accessibilityLabel={t('backup.backupPassword')}
          secureTextEntry
          textContentType="password"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          onSubmitEditing={() => password.length > 0 && openBackup(step.uri, step.name)}
        />
        {/* The reason in red with a warning sign (not only the color) */}
        {error && (
          <View style={styles.error} accessible accessibilityLabel={error}>
            <SymbolView name="exclamationmark.triangle.fill" tintColor={DANGER_COLOR(theme)} size={16} />
            <ThemedText style={[styles.errorText, { color: DANGER_COLOR(theme) }]}>{error}</ThemedText>
          </View>
        )}
        <PrimaryButton
          label={t('backup.openBackup')}
          symbol="lock.open"
          disabled={password.length === 0}
          onPress={() => openBackup(step.uri, step.name)}
        />
        <SecondaryButton label={t('common.cancel')} onPress={reset} />
      </View>
    );
  } else {
    const documents = saved ? t('common.documents', { count: saved.documents }) : '';
    body = (
      <>
        {saved ? (
          <WhiteCard style={styles.statusCard}>
            <LinearGradient
              colors={['#6FD3AE', '#45B68E']}
              start={GRADIENT_START}
              end={GRADIENT_END}
              style={styles.doneCircle}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants">
              <SymbolView name="checkmark" tintColor="#FFFFFF" size={30} weight="bold" />
            </LinearGradient>
            <Text style={styles.statusTitle} accessibilityRole="header">
              {justCreated ? t('backup.completed') : t('backup.lastBackup')}
            </Text>
            <Text style={styles.statusText}>{`${documents} · ${formatBytes(saved.bytes)} · ${whenText(saved.createdAt)}`}</Text>
            <View style={styles.path}>
              <SymbolView name="folder" tintColor={theme.indigo} size={18} accessibilityElementsHidden />
              <Text style={styles.pathText}>{t('backup.path', { name: saved.name })}</Text>
            </View>
            <SoftButton symbol="square.and.arrow.up" label={t('backup.copyElsewhere')} onPress={copyElsewhere} />
            <Pressable onPress={() => setStep({ kind: 'create' })} accessibilityRole="button" style={styles.again}>
              <Text style={styles.againText}>{t('backup.createNew')}</Text>
            </Pressable>
          </WhiteCard>
        ) : (
          <WhiteCard style={styles.statusCard}>
            <View style={styles.idleCircle} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <SymbolView name="externaldrive.badge.icloud" tintColor={APRICOT} size={30} />
            </View>
            <Text style={styles.statusTitle} accessibilityRole="header">
              {t('backup.noneTitle')}
            </Text>
            <Text style={styles.statusText}>{t('backup.noneText')}</Text>
            <PrimaryButton
              label={t('backup.createNow')}
              symbol="arrow.down.doc"
              onPress={() => setStep({ kind: 'create' })}
              style={styles.create}
            />
          </WhiteCard>
        )}

        <Text style={styles.section} accessibilityRole="header">
          {t('backup.restoreSection')}
        </Text>
        <WhiteCard style={styles.restoreCard}>
          <Text style={styles.restoreTitle}>{t('backup.restoreTitle')}</Text>
          <Text style={styles.restoreText}>{t('backup.restoreText')}</Text>
          <SoftButton symbol="arrow.counterclockwise" label={t('backup.chooseFile')} onPress={pickBackup} plain />
        </WhiteCard>

        <Text style={styles.section} accessibilityRole="header">
          {t('backup.remindersSection')}
        </Text>
        <WhiteCard style={[styles.reminder, large && styles.reminderLarge]}>
          <View style={styles.reminderIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <SymbolView name="bell" tintColor={APRICOT} size={18} />
          </View>
          {/* Read by VoiceOver with the value, on the button */}
          <Text
            style={[styles.reminderLabel, large && styles.reminderLabelLarge]}
            accessibilityElementsHidden
            importantForAccessibility="no">
            {t('backup.remindMe')}
          </Text>
          <Pressable
            onPress={() => setFrequencyOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t('backup.remindMeValue', { value: backupFrequencyLabel(frequency) })}
            hitSlop={4}
            style={styles.select}>
            <Text style={styles.selectText}>{backupFrequencyLabel(frequency)}</Text>
            <SymbolView name="chevron.down" tintColor={theme.textSecondary} size={12} weight="semibold" />
          </Pressable>
        </WhiteCard>
        <Text style={styles.footnote}>{t('backup.footnote')}</Text>
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
              accessibilityLabel={t('common.back')}
              color={theme.text}
              onPress={() => (step.kind === 'idle' ? router.back() : reset())}
            />
          )}
          <NoBreakText style={styles.title} accessibilityRole="header">
            {t('backup.title')}
          </NoBreakText>
          <Text style={styles.subtitle}>{t('backup.subtitle')}</Text>
        </View>
        {body}
      </ScrollView>

      <ActionSheet
        visible={frequencyOpen}
        title={t('backup.remindMe')}
        actions={BACKUP_FREQUENCIES.map((value) => ({
          key: value,
          label: backupFrequencyLabel(value),
          symbol: 'calendar',
          selected: value === frequency,
          onPress: () => chooseFrequency(value),
        }))}
        onClose={() => setFrequencyOpen(false)}
      />
    </>
  );
}

// Lilac full-width button of the design ("Copia il file altrove", "Scegli un file di backup")
function SoftButton({ symbol, label, onPress, plain = false }: { symbol: SFSymbol; label: string; onPress: () => void; plain?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = plain ? theme.text : theme.indigo;
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    paddingHorizontal: Spacing.side,
    gap: 20,
  },
  title: {
    marginTop: 22,
    fontSize: 30,
    fontFamily: FONTS.bold,
    color: c.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
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
    backgroundColor: APRICOT_TINT(c),
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
    color: c.text,
    textAlign: 'center',
  },
  statusText: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
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
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pathText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: FONTS.medium,
    color: c.textOnLilac,
  },
  soft: {
    marginTop: 14,
    alignSelf: 'stretch',
    minHeight: 52,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 26,
    backgroundColor: c.lilac,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  softText: {
    flexShrink: 1,
    textAlign: 'center',
    fontSize: 15,
    fontFamily: FONTS.semiBold,
  },
  pressed: {
    opacity: 0.7,
  },
  again: {
    marginTop: 0,
    minHeight: 44, // touch target (the design's 12pt gap is inside it)
    justifyContent: 'center',
  },
  againText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.accent,
  },
  section: {
    marginBottom: -10,
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: c.textSecondary,
  },
  restoreCard: {
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  restoreTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  restoreText: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  reminder: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  reminderLarge: {
    flexWrap: 'wrap', // larger text: the choice goes under the label
  },
  reminderIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: APRICOT_TINT(c),
    alignItems: 'center',
    justifyContent: 'center',
  },
  reminderLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: c.text,
  },
  reminderLabelLarge: {
    flexBasis: '70%',
  },
  select: {
    minHeight: 38,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: c.paleLilac,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  selectText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: c.text,
  },
  footnote: {
    marginHorizontal: 4,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: c.textSecondary,
  },
  form: {
    gap: 12,
  },
  warning: {
    color: DANGER_COLOR(c),
    fontWeight: 600,
  },
  error: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  errorText: {
    flex: 1,
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
    backgroundColor: BRAND_COLOR(c),
  },
});
