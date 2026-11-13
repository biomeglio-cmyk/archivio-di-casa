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
import { type Palette, Spacing } from '@/constants/theme';
import { getDocumentDetail, saveDocumentDeadline } from '@/db/documents';
import type { DocumentDetail } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { afterDocumentSaved } from '@/notifications/reminders';
import { usePreferences } from '@/settings/preferences';
import { parseISODate, toISODate } from '@/utils/dates';
import { REPEAT_UNITS, unitCount, unitName, type RepeatUnit } from '@/utils/recurrence';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Modal "Scadenza", from the detail of ANY document (every category, photo, scan, PDF, card, new
// or saved long ago): add, change or remove its deadline with "Si ripete" and "Promemoria".
// Saves directly; the reminder, the «Sottomano» calendar event and Scadenze follow.
export default function DeadlineScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);

  return document ? (
    <DeadlineContent document={document} />
  ) : (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button onPress={() => router.back()}>{t('common.cancel')}</Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function DeadlineContent({ document }: { document: DocumentDetail }) {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
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
      Alert.alert(t('deadlineScreen.saveFailed'), error instanceof Error ? error.message : String(error));
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
    Alert.alert(t('deadlines.removeAlert.title'), t('deadlines.removeAlert.message'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('deadlines.removeAlert.confirm'), style: 'destructive', onPress: () => run(() => saveDocumentDeadline(db, document.id, null)) },
    ]);
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <ThemedText style={styles.intro} accessibilityRole="header">
          {document.title}
        </ThemedText>

        <View style={styles.dateGroup}>
          <Group title={t('deadlineScreen.date')}>
            <View style={styles.calendarBox}>
              {/* Our calendar: months and weekdays in the app language, Monday first */}
              <DateCalendar value={date} onChange={setDate} />
            </View>
          </Group>
        </View>

        <Group footer={t('deadlineScreen.footer')}>
          <Row label={t('deadlineSection.repeats')} symbol="arrow.clockwise" first>
            <Choice<RepeatUnit | 'never'>
              title={t('deadlineSection.repeats')}
              value={repeatUnit}
              options={['never', ...REPEAT_UNITS]}
              labelFor={(unit) => (unit === 'never' ? t('deadlineSection.never') : capitalize(unitName(unit, 2)))}
              onChange={setRepeatUnit}
            />
          </Row>
          {repeatUnit !== 'never' && (
            <Row label={t('deadlineScreen.every')} symbol="number">
              <Choice
                title={t('deadlineScreen.every')}
                value={repeatEvery}
                options={EVERY_OPTIONS.slice(0, 31)}
                labelFor={(n) => unitCount(repeatUnit, n)}
                onChange={setRepeatEvery}
              />
            </Row>
          )}
          <Row label={t('deadlineSection.reminder')} symbol="bell">
            <Choice
              title={t('deadlineSection.reminder')}
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
            label={t('deadlines.removeDeadline')}
            symbol="calendar.badge.minus"
            onPress={remove}
            disabled={saving}
            background={theme.errorBackground}
            color={theme.error}
          />
        )}
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>{t('common.cancel')}</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={saving} onPress={save}>
          {t('common.save')}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const makeStyles = (c: Palette) =>
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
});
