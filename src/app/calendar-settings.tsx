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
import { type Palette, Spacing } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

type PermissionState = 'unknown' | 'granted' | 'ask' | 'denied';

// Sheet "Calendario": permission and the sync switch. The deadlines go into the app's own
// calendar "Sottomano"; turning the switch off deletes that calendar with all its events.
export default function CalendarSettingsSheet() {
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const { t } = useI18n();
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
      Alert.alert(t('calendarSettings.title'), error instanceof Error ? error.message : String(error));
    } finally {
      setSettings(getCalendarSettings());
      setBusy(false);
    }
  }

  function toggle(enabled: boolean) {
    if (enabled) {
      run(async () => {
        const count = await enableCalendarSync(db);
        return t('calendarSettings.enabled', { count });
      });
      return;
    }
    Alert.alert(t('calendarSettings.removeConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('calendarSettings.remove'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            await disableCalendarSync(db);
            return t('calendarSettings.removed');
          }),
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ThemedText style={styles.title}>{t('calendarSettings.title')}</ThemedText>
      <ThemedText themeColor="textSecondary">{t('calendarSettings.intro')}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t('calendarSettings.details')}
      </ThemedText>

      {permission === 'ask' && <PrimaryButton label={t('calendarSettings.allowAccess')} onPress={askPermission} />}

      {permission === 'denied' && (
        <>
          <ThemedText themeColor="textSecondary">{t('calendarSettings.denied')}</ThemedText>
          <PrimaryButton label={t('calendarSettings.openSettings')} onPress={() => Linking.openSettings()} />
        </>
      )}

      {permission === 'granted' && (
        <>
          <WhiteCard style={[styles.card, styles.switchRow]}>
            <ThemedText style={styles.switchLabel}>{t('calendarSettings.switchLabel')}</ThemedText>
            <Switch value={settings.enabled} onValueChange={toggle} disabled={busy} accessibilityLabel={t('calendarSettings.switchLabel')} />
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

const makeStyles = (c: Palette) =>
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
});
