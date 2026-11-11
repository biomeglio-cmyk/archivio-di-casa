import { Host, Picker } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet } from 'react-native';

import { resyncCalendarAlarms } from '@/calendar/calendar-sync';
import { Group, Row } from '@/components/grouped-list';
import { Switch } from '@/components/switch';
import { BRAND_COLOR } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { rescheduleReminders, updateAppBadge } from '@/notifications/reminders';
import { getPreferences, savePreferences, type Preferences } from '@/settings/preferences';

const DAYS_OPTIONS = [1, 3, 7, 15, 30, 60];

// "Notifiche" (from the Menu): deadline reminders and the number on the app icon.
// Preferences live in the expo-sqlite key-value store (src/settings/preferences.ts).
export default function NotificationSettingsScreen() {
  const db = useSQLiteContext();
  const [preferences, setPreferences] = useState<Preferences>(getPreferences);
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);

  // Like ngOnInit, but also when coming back from the iPhone Settings: the permission may have changed
  useFocusEffect(
    useCallback(() => {
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
          "Per ricevere i promemoria consenti le notifiche a sottomano nelle Impostazioni dell'iPhone.",
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

  const reminderTime = new Date(2000, 0, 1, preferences.reminderHour, preferences.reminderMinute);

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Group title="Promemoria" footer="«Avvisa prima di» vale per i documenti senza un promemoria proprio.">
          <Row label="Promemoria scadenze" symbol="bell.badge" first>
            <Switch value={preferences.remindersEnabled} onValueChange={toggleReminders} accessibilityLabel="Promemoria scadenze" />
          </Row>
          {preferences.remindersEnabled && (
            <>
              <Row label="Ora dell'avviso" symbol="clock">
                {/* Used on its own: this component creates its own Host, sized to its content */}
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display="compact"
                  accentColor={BRAND_COLOR}
                  onValueChange={(_, date) => update({ reminderHour: date.getHours(), reminderMinute: date.getMinutes() })}
                />
              </Row>
              <Row label="Avvisa prima di" symbol="calendar.badge.clock">
                <Host matchContents>
                  <Picker
                    selectedValue={preferences.defaultReminderDays}
                    onValueChange={(days) => update({ defaultReminderDays: days })}>
                    {DAYS_OPTIONS.map((days) => (
                      <Picker.Item key={days} label={days === 1 ? '1 giorno' : `${days} giorni`} value={days} />
                    ))}
                  </Picker>
                </Host>
              </Row>
            </>
          )}
          {notificationsBlocked && (
            <Row
              label="Le notifiche sono bloccate: apri le Impostazioni dell'iPhone"
              symbol="exclamationmark.triangle"
              onPress={() => Linking.openSettings()}
            />
          )}
        </Group>

        <Group footer="Mostra sull'icona di sottomano quante scadenze sono già passate o arrivano entro 7 giorni.">
          <Row label="Numero sull'icona" symbol="app.badge" first>
            <Switch value={preferences.iconBadgeEnabled} onValueChange={(value) => update({ iconBadgeEnabled: value })} accessibilityLabel="Numero sull'icona" />
          </Row>
        </Group>
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Fine
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
    gap: 24,
  },
});
