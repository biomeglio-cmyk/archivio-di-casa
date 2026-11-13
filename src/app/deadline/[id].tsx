import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { DateCalendar } from '@/components/date-calendar';
import { Choice, Group, Row } from '@/components/grouped-list';
import { SecondaryButton } from '@/components/secondary-button';
import { ThemedText } from '@/components/themed-text';
import {
  EVERY_OPTIONS,
  reminderChoiceLabel,
  reminderChoices,
  reminderLabel,
  reminderPickerValue,
  reminderToSave,
} from '@/constants/deadline-options';
import { Colors, Spacing, themedStyles } from '@/constants/theme';
import { getDocumentDetail, saveDocumentDeadline } from '@/db/documents';
import type { DocumentDetail } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { afterDocumentSaved } from '@/notifications/reminders';
import { usePreferences } from '@/settings/preferences';
import { parseISODate, toISODate } from '@/utils/dates';
import { REPEAT_UNITS, unitName, type RepeatUnit } from '@/utils/recurrence';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Modal "Scadenza", from the detail of ANY document (every category, photo, scan, PDF, card, new
// or saved long ago): add, change or remove its deadline with "Si ripete" and "Promemoria".
// Saves directly; the reminder, the «Sottomano» calendar event and Scadenze follow.
export default function DeadlineScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);

  return document ? (
    <DeadlineContent document={document} />
  ) : (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function DeadlineContent({ document }: { document: DocumentDetail }) {
  const db = useSQLiteContext();
  const theme = useTheme();
  const { defaultReminderDays } = usePreferences();
  const [date, setDate] = useState(() => (document.expiresAt ? parseISODate(document.expiresAt) : new Date()));
  const [repeatUnit, setRepeatUnit] = useState<RepeatUnit | 'never'>(document.repeat?.unit ?? 'never');
  const [repeatEvery, setRepeatEvery] = useState(document.repeat?.every ?? 1);
  const [reminderDays, setReminderDays] = useState(reminderPickerValue(document.reminderDays));
  const [saving, setSaving] = useState(false);

  async function run(work: () => Promise<void>) {
    setSaving(true);
    try {
      await work();
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  function save() {
    const expiresAt = toISODate(date);
    return run(async () => {
      await saveDocumentDeadline(db, document.id, {
        expiresAt,
        reminderDays: reminderToSave(reminderDays),
        repeat: repeatUnit === 'never' ? null : { every: repeatEvery, unit: repeatUnit },
      });
      await afterDocumentSaved(db, expiresAt); // asks for notifications the first time
    });
  }

  function remove() {
    Alert.alert('Togliere la scadenza?', 'Il documento resta; spariscono promemoria ed evento nel calendario.', [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Togli', style: 'destructive', onPress: () => run(() => saveDocumentDeadline(db, document.id, null)) },
    ]);
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText style={styles.intro}>{document.title}</ThemedText>

        <View style={styles.dateGroup}>
          <Group title="Data">
            <View style={styles.calendarBox}>
              {/* Our calendar: Italian months, L M M G V S D, Monday first, whatever the phone language */}
              <DateCalendar value={date} onChange={setDate} />
            </View>
          </Group>
        </View>

        <Group footer="Il promemoria arriva sul telefono; con il calendario attivo la scadenza è anche in «Sottomano».">
          <Row label="Si ripete" symbol="arrow.clockwise" first>
            <Choice<RepeatUnit | 'never'>
              title="Si ripete"
              value={repeatUnit}
              options={['never', ...REPEAT_UNITS]}
              labelFor={(unit) => (unit === 'never' ? 'Mai' : capitalize(unitName(unit, 2)))}
              onChange={setRepeatUnit}
            />
          </Row>
          {repeatUnit !== 'never' && (
            <Row label="Ogni" symbol="number">
              <Choice
                title="Ogni"
                value={repeatEvery}
                options={EVERY_OPTIONS.slice(0, 31)}
                labelFor={(n) => `${n} ${unitName(repeatUnit, n)}`}
                onChange={setRepeatEvery}
              />
            </Row>
          )}
          <Row label="Promemoria" symbol="bell">
            <Choice
              title="Promemoria"
              value={reminderDays}
              options={reminderChoices(reminderDays)}
              labelFor={(days) => reminderLabel(days, defaultReminderDays)}
              menuLabelFor={(days) => reminderChoiceLabel(days, defaultReminderDays)}
              onChange={setReminderDays}
            />
          </Row>
        </Group>

        {document.expiresAt && (
          <SecondaryButton
            label="Togli la scadenza"
            symbol="calendar.badge.minus"
            onPress={remove}
            disabled={saving}
            background={Colors.current.errorBackground}
            color={theme.error}
          />
        )}
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={saving} onPress={save}>
          Salva
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
    gap: Spacing.section,
  },
  intro: {
    paddingHorizontal: 4,
    fontWeight: 600,
  },
  // "DATA" as far from the title above as the other section titles are from their card
  dateGroup: {
    marginTop: 8,
  },
  calendarBox: {
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
}));
