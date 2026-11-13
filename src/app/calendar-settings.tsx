import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet } from 'react-native';

import { getCalendarSettings, type CalendarSettings } from '@/calendar/calendar-settings';
import {
  disableCalendarSync,
  enableCalendarSync,
  getCalendarPermission,
  migrateLegacyCalendar,
  requestCalendarPermission,
} from '@/calendar/calendar-sync';
import { PrimaryButton } from '@/components/primary-button';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { Spacing, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type PermissionState = 'unknown' | 'granted' | 'ask' | 'denied';

// Sheet "Calendario": permission and the sync switch. The deadlines go into the app's own
// calendar "Sottomano"; turning the switch off deletes that calendar with all its events.
export default function CalendarSettingsSheet() {
  const db = useSQLiteContext();
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [settings, setSettings] = useState<CalendarSettings>(getCalendarSettings);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  // Like ngOnInit: read the permission once when the sheet opens (and finish the move away from
  // a personal calendar left by an older version, now that we may have the permission)
  useEffect(() => {
    getCalendarPermission().then(async (result) => {
      if (result.granted) {
        setPermission('granted');
        await migrateLegacyCalendar(db);
        setSettings(getCalendarSettings());
      } else {
        setPermission(result.canAskAgain ? 'ask' : 'denied');
      }
    });
  }, [db]);

  async function askPermission() {
    const result = await requestCalendarPermission();
    setPermission(result.granted ? 'granted' : result.canAskAgain ? 'ask' : 'denied');
  }

  // Runs a calendar operation with a spinner and a readable error
  async function run(task: () => Promise<string>) {
    setBusy(true);
    setStatus(null);
    try {
      setStatus(await task());
    } catch (error) {
      Alert.alert('Calendario', error instanceof Error ? error.message : String(error));
    } finally {
      setSettings(getCalendarSettings());
      setBusy(false);
    }
  }

  function toggle(enabled: boolean) {
    if (enabled) {
      run(async () => {
        const count = await enableCalendarSync(db);
        return `${count === 1 ? '1 scadenza' : `${count} scadenze`} nel calendario «Sottomano»`;
      });
      return;
    }
    Alert.alert('Togliere il calendario Sottomano e tutte le sue scadenze dal Calendario?', undefined, [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Togli',
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await disableCalendarSync(db);
            return 'Calendario «Sottomano» cancellato';
          }),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.title}>Calendario</ThemedText>
      <ThemedText themeColor="textSecondary">
        Le scadenze vanno in un calendario separato, «Sottomano». Puoi nasconderlo nell&apos;app Calendario; spegnendo
        qui, viene cancellato.
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        Ogni scadenza è un evento di tutto il giorno «Scade: titolo», senza altri dati del documento. Se i promemoria di
        sottomano sono spenti, l&apos;evento avvisa alle 9 nel giorno del promemoria; se sono accesi avvisa solo
        l&apos;app, così non ricevi due avvisi.
      </ThemedText>

      {permission === 'ask' && <PrimaryButton label="Consenti accesso al Calendario" onPress={askPermission} />}

      {permission === 'denied' && (
        <>
          <ThemedText themeColor="textSecondary">
            L&apos;accesso al Calendario è stato negato. Puoi attivarlo nelle Impostazioni dell&apos;iPhone.
          </ThemedText>
          <PrimaryButton label="Apri Impostazioni" onPress={() => Linking.openSettings()} />
        </>
      )}

      {permission === 'granted' && (
        <>
          <WhiteCard style={[styles.card, styles.switchRow]}>
            <ThemedText style={styles.switchLabel}>Scadenze nel calendario «Sottomano»</ThemedText>
            <Switch value={settings.enabled} onValueChange={toggle} disabled={busy} accessibilityLabel="Scadenze nel calendario «Sottomano»" />
          </WhiteCard>

          {busy && <ActivityIndicator />}
          {status && !busy && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.status}>
              {status}
            </ThemedText>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.side,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.bold,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
  },
  switchLabel: {
    flex: 1,
  },
  status: {
    textAlign: 'center',
  },
}));
