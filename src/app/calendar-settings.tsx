import { Host, Switch } from '@expo/ui';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getCalendarSettings, saveCalendarSettings, type CalendarSettings } from '@/calendar/calendar-settings';
import {
  getCalendarPermission,
  listWritableCalendars,
  removeAllEvents,
  requestCalendarPermission,
  syncAllEvents,
  type WritableCalendar,
} from '@/calendar/calendar-sync';
import { GradientButton } from '@/components/gradient-button';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, FONTS } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

type PermissionState = 'unknown' | 'granted' | 'ask' | 'denied';

// Sheet "Calendario": permission, choice of a writable calendar, and the sync switch
export default function CalendarSettingsSheet() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [permission, setPermission] = useState<PermissionState>('unknown');
  const [calendars, setCalendars] = useState<WritableCalendar[]>([]);
  const [settings, setSettings] = useState<CalendarSettings>(getCalendarSettings);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function loadCalendars() {
    setCalendars(await listWritableCalendars());
  }

  // Like ngOnInit: read the permission once when the sheet opens
  useEffect(() => {
    getCalendarPermission().then((result) => {
      if (result.granted) {
        setPermission('granted');
        listWritableCalendars().then(setCalendars, () => setCalendars([]));
      } else {
        setPermission(result.canAskAgain ? 'ask' : 'denied');
      }
    });
  }, []);

  async function askPermission() {
    const result = await requestCalendarPermission();
    if (result.granted) {
      setPermission('granted');
      await loadCalendars();
    } else {
      setPermission(result.canAskAgain ? 'ask' : 'denied');
    }
  }

  function update(next: CalendarSettings) {
    saveCalendarSettings(next);
    setSettings(next);
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
      setBusy(false);
    }
  }

  function chooseCalendar(calendar: WritableCalendar) {
    if (calendar.id === settings.calendarId) return;
    const next = { ...settings, calendarId: calendar.id, calendarTitle: calendar.title };
    if (!settings.enabled) {
      update(next);
      return;
    }
    // Sync already on: move the events to the new calendar
    run(async () => {
      await removeAllEvents(db);
      update(next);
      const count = await syncAllEvents(db, calendar.id);
      return `${count === 1 ? '1 scadenza' : `${count} scadenze`} in "${calendar.title}"`;
    });
  }

  function toggle(enabled: boolean) {
    const calendarId = settings.calendarId;
    if (!calendarId) return;
    run(async () => {
      if (enabled) {
        update({ ...settings, enabled: true });
        const count = await syncAllEvents(db, calendarId);
        return `${count === 1 ? '1 scadenza aggiunta' : `${count} scadenze aggiunte`} al calendario`;
      }
      await removeAllEvents(db);
      update({ ...settings, enabled: false });
      return 'Eventi rimossi dal calendario';
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.title}>Calendario</ThemedText>
      <ThemedText themeColor="textSecondary">
        Ogni scadenza diventa un evento di tutto il giorno «Scade: titolo». Se i promemoria di sottomano sono spenti,
        l&apos;evento ha un avviso alle 9 nel giorno del promemoria (quello del documento, altrimenti «Avvisa prima di»); se sono accesi avvisa solo l&apos;app, così non ricevi
        due avvisi. Nel calendario non finisce nessun altro dato del documento.
      </ThemedText>

      {permission === 'ask' && <GradientButton label="Consenti accesso al Calendario" onPress={askPermission} />}

      {permission === 'denied' && (
        <>
          <ThemedText themeColor="textSecondary">
            L&apos;accesso al Calendario è stato negato. Puoi attivarlo nelle Impostazioni dell&apos;iPhone.
          </ThemedText>
          <GradientButton label="Apri Impostazioni" onPress={() => Linking.openSettings()} />
        </>
      )}

      {permission === 'granted' && (
        <>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            Scegli il calendario
          </ThemedText>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {calendars.length === 0 && (
              <ThemedText themeColor="textSecondary" style={styles.empty}>
                Nessun calendario modificabile su questo iPhone.
              </ThemedText>
            )}
            {calendars.map((calendar, index) => (
              <Pressable
                key={calendar.id}
                onPress={() => chooseCalendar(calendar)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityState={{ selected: calendar.id === settings.calendarId }}
                style={[
                  styles.calendarRow,
                  index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
                ]}>
                <View style={[styles.colorDot, { backgroundColor: calendar.color }]} />
                <View style={styles.calendarTexts}>
                  <ThemedText numberOfLines={1}>{calendar.title}</ThemedText>
                  {calendar.source ? (
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {calendar.source}
                    </ThemedText>
                  ) : null}
                </View>
                {calendar.id === settings.calendarId && <SymbolView name="checkmark" tintColor={BRAND_COLOR} size={18} />}
              </Pressable>
            ))}
          </View>

          <View style={[styles.card, styles.switchRow, { backgroundColor: theme.surface }]}>
            <ThemedText style={styles.switchLabel}>Aggiungi le scadenze al calendario</ThemedText>
            <Host matchContents>
              <Switch value={settings.enabled} onValueChange={toggle} disabled={busy || !settings.calendarId} />
            </Host>
          </View>
          {!settings.calendarId && (
            <ThemedText type="small" themeColor="textSecondary">
              Scegli prima un calendario.
            </ThemedText>
          )}

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

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 16,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
    fontFamily: FONTS.titleBold,
  },
  sectionTitle: {
    paddingHorizontal: 4,
    marginBottom: -8,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  empty: {
    paddingVertical: 14,
  },
  calendarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarTexts: {
    flex: 1,
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
});
