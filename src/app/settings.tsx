import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { getCalendarSettings } from '@/calendar/calendar-settings';
import { Group, Row } from '@/components/grouped-list';

// "Impostazioni", from the gear in the Archivio header: links to the screens that hold the settings
export default function SettingsScreen() {
  const [calendarLabel, setCalendarLabel] = useState('');

  // Like ngOnInit, but also when coming back from the Calendario sheet
  useFocusEffect(
    useCallback(() => {
      const calendar = getCalendarSettings();
      setCalendarLabel(calendar.enabled && calendar.calendarTitle ? calendar.calendarTitle : 'Spento');
    }, []),
  );

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <Group>
          <Row label="Notifiche" symbol="bell.badge" first onPress={() => router.push('/notification-settings')} />
          <Row label="Calendario" symbol="calendar" value={calendarLabel} onPress={() => router.push('/calendar-settings')} />
          <Row label="Preferiti" symbol="heart" onPress={() => router.push('/pinned-edit')} />
        </Group>
        <Group>
          <Row label="Aiuto" symbol="questionmark.circle" first onPress={() => router.push('/onboarding')} />
          <Row label="Info e privacy" symbol="info.circle" onPress={() => router.push('/about')} />
          <Row label="Face ID e backup" symbol="faceid" value="presto" disabled />
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
    padding: 16,
    paddingBottom: 48,
    gap: 24,
  },
});
