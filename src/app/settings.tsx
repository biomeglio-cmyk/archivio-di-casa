import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Fragment, useCallback, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { rateApp, turnOnAppLock } from '@/actions/app-actions';
import { daysSinceLastBackup } from '@/backup/backup-layout';
import { getCalendarSettings } from '@/calendar/calendar-settings';
import { resyncCalendarAlarms } from '@/calendar/calendar-sync';
import { FreeUsageCard } from '@/components/free-usage-card';
import { Switch } from '@/components/switch';
import { Text } from '@/components/text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR } from '@/constants/brand';
import { Colors, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { rescheduleReminders, updateAppBadge } from '@/notifications/reminders';
import { disableAppLock, useAppLockEnabled } from '@/security/app-lock';
import { usePaletteId } from '@/settings/palette';
import { PALETTES } from '@/constants/palettes';
import { getPreferences, savePreferences, type Preferences } from '@/settings/preferences';
import { FREE_LIMIT_ENFORCED, setLimitPreview, useLimitPreview } from '@/settings/free-limit';
import { chooseAction } from '@/utils/action-sheet';

// "Avviso predefinito": how many days before a deadline, for documents without their own value
const DAYS_OPTIONS = [1, 2, 3, 7, 15, 30, 60];

// Icon square colors of each section, from docs/design/Impostazioni.dc.html
const TINTS = {
  security: { background: Colors.light.lilac, icon: Colors.light.indigo },
  grey: { background: '#F0F1F5', icon: '#4B5068' },
  reminders: { background: '#FFF0E7', icon: '#C2530F' },
  backup: { background: '#EAF2FE', icon: '#2F62C8' },
  info: { background: '#E6F7F0', icon: '#1F7A5A' },
} as const;
type Tint = (typeof TINTS)[keyof typeof TINTS];

function daysLabel(days: number): string {
  return days === 1 ? '1 giorno prima' : `${days} giorni prima`;
}

function timeLabel(hour: number, minute: number): string {
  return `${hour}:${String(minute).padStart(2, '0')}`;
}

function lastBackupLabel(days: number | null): string {
  if (days === null) return 'Mai fatto';
  if (days === 0) return 'Oggi';
  if (days === 1) return 'Ieri';
  return `${days} giorni fa`;
}

// "Impostazioni" (docs/design/Impostazioni.dc.html), from the side menu: free version card,
// SICUREZZA, PROMEMORIA, BACKUP, ASPETTO, INFORMAZIONI and the version. Our extras are inside the
// sections they belong to: "Numero sull'icona" and Calendario «Sottomano» in PROMEMORIA,
// "Colori delle categorie" (the palettes) in ASPETTO.
export default function SettingsScreen() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const lockEnabled = useAppLockEnabled();
  const paletteId = usePaletteId();
  const [preferences, setPreferences] = useState<Preferences>(getPreferences);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  // Hidden test switch: 5 taps on the version show "Anteprima limite gratuito"
  const limitPreview = useLimitPreview();
  const [versionTaps, setVersionTaps] = useState(0);
  const showDebug = versionTaps >= 5 || limitPreview;
  const [calendarLabel, setCalendarLabel] = useState('');

  // Coming back from the iPhone Settings, Backup or Calendario: permission, dates and labels may have changed
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
      const calendar = getCalendarSettings();
      setCalendarLabel(calendar.enabled && calendar.calendarTitle ? calendar.calendarTitle : 'Spento');
      Notifications.getPermissionsAsync().then((p) => setNotificationsBlocked(!p.granted && !p.canAskAgain));
    }, []),
  );

  // Saves a change and applies it at once: reminders and the icon number are rebuilt
  function update(change: Partial<Preferences>) {
    setPreferences(savePreferences(change));
    rescheduleReminders(db);
    updateAppBadge(db);
  }

  async function toggleReminders(enabled: boolean) {
    if (enabled) {
      const permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      if (!permission.granted) {
        setNotificationsBlocked(!permission.canAskAgain);
        Alert.alert(
          'Notifiche disattivate',
          "Per ricevere i promemoria consenti le notifiche a Sottomano nelle Impostazioni dell'iPhone.",
          [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Apri Impostazioni', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    update({ remindersEnabled: enabled });
    // Calendar events: no alarm while the app reminds, the 9:00 alarm when it doesn't
    resyncCalendarAlarms(db);
  }

  function toggleLock(value: boolean) {
    if (value) turnOnAppLock();
    else disableAppLock();
  }

  async function chooseDefaultDays() {
    const index = await chooseAction('Avviso predefinito', DAYS_OPTIONS.map(daysLabel));
    if (index !== null) update({ defaultReminderDays: DAYS_OPTIONS[index] });
  }

  const reminderTime = new Date(2000, 0, 1, preferences.reminderHour, preferences.reminderMinute);
  const paletteName = PALETTES.find((p) => p.id === paletteId)?.name ?? '';
  const version = Constants.expoConfig?.version ?? '1.0';
  const open = (href: Href) => router.push(href);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40 }]}>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        accessibilityLabel="Indietro"
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
        <SymbolView name="chevron.left" tintColor={Colors.light.text} size={20} weight="semibold" />
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        Impostazioni
      </Text>

      <View style={styles.card}>
        <FreeUsageCard variant="settings" />
      </View>

      <Section title="Sicurezza">
        <SettingsRow
          symbol="faceid"
          tint={TINTS.security}
          label="Blocca con Face ID"
          subtitle="Chiede il volto ogni volta che apri l’app"
          onPress={() => toggleLock(!lockEnabled)}
          trailing={<Switch value={lockEnabled} onValueChange={toggleLock} accessibilityLabel="Blocca con Face ID" />}
        />
        <SettingsRow
          symbol="eye.slash"
          tint={TINTS.grey}
          label="Nascondi anteprime"
          subtitle="Nelle notifiche non si vede il documento"
          onPress={() => update({ hidePreviews: !preferences.hidePreviews })}
          trailing={
            <Switch
              value={preferences.hidePreviews}
              onValueChange={(value) => update({ hidePreviews: value })}
              accessibilityLabel="Nascondi anteprime"
            />
          }
        />
      </Section>

      <Section title="Promemoria">
        <SettingsRow
          symbol="bell"
          tint={TINTS.reminders}
          label="Notifiche"
          onPress={() => toggleReminders(!preferences.remindersEnabled)}
          trailing={
            <Switch value={preferences.remindersEnabled} onValueChange={toggleReminders} accessibilityLabel="Notifiche" />
          }
        />
        <SettingsRow
          symbol="clock"
          tint={TINTS.reminders}
          label="Orario degli avvisi"
          value={timeLabel(preferences.reminderHour, preferences.reminderMinute)}
          expanded={timeOpen}
          onPress={() => setTimeOpen((value) => !value)}
        />
        {timeOpen && (
          <View style={styles.timePicker}>
            {/* Used on its own: this component creates its own Host */}
            <DateTimePicker
              value={reminderTime}
              mode="time"
              display="spinner"
              locale="it_IT"
              accentColor={BRAND_COLOR}
              onValueChange={(_, date) => update({ reminderHour: date.getHours(), reminderMinute: date.getMinutes() })}
            />
          </View>
        )}
        <SettingsRow
          symbol="calendar"
          tint={TINTS.reminders}
          label="Avviso predefinito"
          value={daysLabel(preferences.defaultReminderDays)}
          onPress={chooseDefaultDays}
        />
        <SettingsRow
          symbol="app.badge"
          tint={TINTS.reminders}
          label="Numero sull’icona"
          subtitle="Scadenze passate o entro 7 giorni"
          onPress={() => update({ iconBadgeEnabled: !preferences.iconBadgeEnabled })}
          trailing={
            <Switch
              value={preferences.iconBadgeEnabled}
              onValueChange={(value) => update({ iconBadgeEnabled: value })}
              accessibilityLabel="Numero sull’icona"
            />
          }
        />
        <SettingsRow
          symbol="calendar.badge.plus"
          tint={TINTS.reminders}
          label="Calendario «Sottomano»"
          value={calendarLabel}
          onPress={() => open('/calendar-settings')}
        />
        {notificationsBlocked && (
          <SettingsRow
            symbol="exclamationmark.triangle"
            tint={TINTS.reminders}
            label="Le notifiche sono bloccate"
            subtitle="Consentile nelle Impostazioni dell’iPhone"
            onPress={() => Linking.openSettings()}
          />
        )}
      </Section>

      <Section
        title="Backup"
        note="Il backup è un file salvato sul tuo telefono, nell’app File. Puoi copiarlo dove vuoi. Sottomano funziona anche senza internet.">
        <SettingsRow
          symbol="icloud.and.arrow.up"
          tint={TINTS.backup}
          label="Crea un backup ora"
          value={lastBackupLabel(daysSinceLastBackup(now))}
          onPress={() => open({ pathname: '/backup', params: { action: 'create' } })}
        />
        <SettingsRow
          symbol="arrow.down.to.line"
          tint={TINTS.backup}
          label="Ripristina da un backup"
          onPress={() => open({ pathname: '/backup', params: { action: 'restore' } })}
        />
      </Section>

      <Section title="Aspetto">
        <SettingsRow
          symbol="moon"
          tint={TINTS.grey}
          label="Tema"
          value="Chiaro"
          onPress={() => Alert.alert('Tema', 'Per ora Sottomano usa solo il tema chiaro. Il tema scuro arriverà più avanti.')}
        />
        <SettingsRow
          symbol="paintpalette"
          tint={TINTS.grey}
          label="Colori delle categorie"
          value={paletteName}
          onPress={() => open('/appearance')}
        />
      </Section>

      <Section title="Informazioni">
        <SettingsRow symbol="questionmark.circle" tint={TINTS.info} label="Aiuto e contatti" onPress={() => open('/onboarding')} />
        <SettingsRow symbol="lock" tint={TINTS.info} label="Privacy" onPress={() => open('/about')} />
        <SettingsRow symbol="doc.text" tint={TINTS.info} label="Termini d’uso" onPress={() => open('/terms')} />
        <SettingsRow symbol="star" tint={TINTS.info} label="Valuta Sottomano" onPress={rateApp} />
        {showDebug && !FREE_LIMIT_ENFORCED && (
          <SettingsRow
            symbol="ladybug"
            tint={TINTS.info}
            label="Anteprima limite gratuito"
            subtitle="Solo per le prove: mostra il + bloccato, il pannello del limite e la scheda in Home"
            trailing={
              <Switch value={limitPreview} onValueChange={setLimitPreview} accessibilityLabel="Anteprima limite gratuito" />
            }
          />
        )}
      </Section>

      <Pressable onPress={() => setVersionTaps((n) => n + 1)} accessibilityRole="text" hitSlop={10}>
        <Text style={styles.version}>Sottomano · versione {version}</Text>
      </Pressable>
    </ScrollView>
  );
}

// A section: grey capitals title, a white card of rows with inset separators, an optional note
function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  const rows = (Array.isArray(children) ? children : [children]).flat().filter(Boolean);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      <WhiteCard style={styles.sectionCard}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 && <View style={styles.separator} />}
            {row}
          </Fragment>
        ))}
      </WhiteCard>
      {note && <Text style={styles.note}>{note}</Text>}
    </View>
  );
}

type RowProps = {
  symbol: SFSymbol;
  tint: Tint;
  label: string;
  subtitle?: string;
  value?: string; // grey value on the right, before the chevron
  trailing?: ReactNode; // a switch instead of the chevron
  expanded?: boolean; // a row that opens something below it
  onPress?: () => void;
};

// One row: 36pt icon square in the section color, label 16/500 (and 12 subtitle), then a value
// with a chevron, or a switch (the whole row toggles it)
function SettingsRow({ symbol, tint, label, subtitle, value, trailing, expanded, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={subtitle}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      accessible={trailing === undefined}
      style={({ pressed }) => [styles.row, pressed && onPress && styles.rowPressed]}>
      <View style={[styles.icon, { backgroundColor: tint.background }]}>
        <SymbolView name={symbol} tintColor={tint.icon} size={19} />
      </View>
      <View style={styles.rowTexts}>
        <Text style={styles.rowLabel}>{label}</Text>
        {subtitle && <Text style={styles.rowSubtitle}>{subtitle}</Text>}
      </View>
      {trailing ?? (
        <>
          {value !== undefined && (
            <Text style={styles.rowValue} numberOfLines={1}>
              {value}
            </Text>
          )}
          <SymbolView
            name={expanded ? 'chevron.down' : 'chevron.right'}
            tintColor={Colors.light.textSecondary}
            size={16}
            weight="semibold"
          />
        </>
      )}
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
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.light.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  title: {
    marginTop: 22,
    fontSize: 30,
    lineHeight: 36,
    fontFamily: FONTS.bold,
    color: Colors.light.text,
  },
  card: {
    marginTop: 20,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    textTransform: 'uppercase',
    color: Colors.light.textSecondary,
  },
  sectionCard: {
    marginTop: 10,
    paddingVertical: 4,
  },
  separator: {
    height: 1,
    marginLeft: 66,
    marginRight: 16,
    backgroundColor: Colors.light.separator,
  },
  note: {
    marginTop: 10,
    marginHorizontal: 6,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 58,
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  rowPressed: {
    backgroundColor: Colors.light.paleLilac,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTexts: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 16,
    fontFamily: FONTS.medium,
    color: Colors.light.text,
  },
  rowSubtitle: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  rowValue: {
    flexShrink: 1,
    maxWidth: '45%',
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: Colors.light.textSecondary,
  },
  timePicker: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  version: {
    marginTop: 22,
    fontSize: 12,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    color: Colors.light.textSecondary,
  },
});
