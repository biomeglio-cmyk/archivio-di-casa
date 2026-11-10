import { Host, Picker, Switch } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { getCalendarSettings } from '@/calendar/calendar-settings';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';
import { rescheduleReminders, updateAppBadge } from '@/notifications/reminders';
import { getPreferences, savePreferences, type Preferences } from '@/settings/preferences';

const DAYS_OPTIONS = [1, 3, 7, 15, 30, 60];

// "Impostazioni", from the gear in the Archivio header: an iOS-style grouped list.
// Preferences live in the expo-sqlite key-value store (src/settings/preferences.ts).
export default function SettingsScreen() {
  const db = useSQLiteContext();
  const theme = useTheme();
  const [preferences, setPreferences] = useState<Preferences>(getPreferences);
  const [calendarLabel, setCalendarLabel] = useState('');
  const [notificationsBlocked, setNotificationsBlocked] = useState(false);

  // Like ngOnInit, but also when coming back from the Calendario sheet: re-read what may have changed
  useFocusEffect(
    useCallback(() => {
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
  }

  const reminderTime = new Date(2000, 0, 1, preferences.reminderHour, preferences.reminderMinute);
  const line = theme.backgroundSelected;

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Group title="Notifiche" footer="«Avvisa prima di» vale per i documenti senza un promemoria proprio.">
          <Row label="Promemoria scadenze" symbol="bell.badge">
            <Host matchContents>
              <Switch value={preferences.remindersEnabled} onValueChange={toggleReminders} />
            </Host>
          </Row>
          {preferences.remindersEnabled && (
            <>
              <Row label="Ora dell'avviso" symbol="clock" separator={line}>
                {/* Used on its own: this component creates its own Host, sized to its content */}
                <DateTimePicker
                  value={reminderTime}
                  mode="time"
                  display="compact"
                  accentColor={BRAND_COLOR}
                  onValueChange={(_, date) => update({ reminderHour: date.getHours(), reminderMinute: date.getMinutes() })}
                />
              </Row>
              <Row label="Avvisa prima di" symbol="calendar.badge.clock" separator={line}>
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
            <Row label="Le notifiche sono bloccate: apri le Impostazioni dell'iPhone" symbol="exclamationmark.triangle" separator={line} onPress={() => Linking.openSettings()} />
          )}
        </Group>

        <Group footer="Mostra sull'icona di sottomano quante scadenze sono già passate o arrivano entro 7 giorni.">
          <Row label="Numero sull'icona" symbol="app.badge">
            <Host matchContents>
              <Switch value={preferences.iconBadgeEnabled} onValueChange={(value) => update({ iconBadgeEnabled: value })} />
            </Host>
          </Row>
        </Group>

        <Group title="Calendario">
          <Row
            label="Calendario dell'iPhone"
            symbol="calendar"
            value={calendarLabel}
            onPress={() => router.push('/calendar-settings')}
          />
        </Group>

        <Group title="Altro">
          <Row label="Aiuto" symbol="questionmark.circle" onPress={() => router.push('/onboarding')} />
          <Row label="Face ID e backup" symbol="faceid" value="presto" disabled separator={line} />
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

function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      {title && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.groupTitle}>
          {title.toUpperCase()}
        </ThemedText>
      )}
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>{children}</View>
      {footer && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

type RowProps = {
  label: string;
  symbol: SFSymbol;
  value?: string; // grey text on the right
  separator?: string; // color of the line above the row
  disabled?: boolean;
  onPress?: () => void; // tappable row with a chevron
  children?: ReactNode; // native control on the right
};

// One row: icon, label (wraps with large text), then a value, a control or a chevron
function Row({ label, symbol, value, separator, disabled = false, onPress, children }: RowProps) {
  const theme = useTheme();
  const content = (
    <>
      <SymbolView name={symbol} tintColor={disabled ? theme.textSecondary : BRAND_COLOR} size={20} />
      <ThemedText style={[styles.label, disabled && { color: theme.textSecondary }]}>{label}</ThemedText>
      {value !== undefined && (
        <ThemedText themeColor="textSecondary" style={styles.value}>
          {value}
        </ThemedText>
      )}
      {children}
      {onPress && !disabled && <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />}
    </>
  );
  const style = [styles.row, separator ? { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separator } : null];

  return onPress && !disabled ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={style}>
      {content}
    </Pressable>
  ) : (
    <View style={style} accessibilityState={{ disabled }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
  group: {
    gap: 6,
  },
  groupTitle: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 16,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
  },
  label: {
    flex: 1,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
