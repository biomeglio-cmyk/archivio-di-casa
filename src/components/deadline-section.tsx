import { router } from 'expo-router';

import { Group, Row } from '@/components/grouped-list';
import { reminderLabel, reminderPickerValue } from '@/constants/deadline-options';
import type { FamilyDocument } from '@/db/types';
import { usePreferences } from '@/settings/preferences';
import { formatDate } from '@/utils/dates';
import { describeRepeat } from '@/utils/recurrence';

// "Scadenza" in the detail of every document (and card), always visible: without a deadline a
// clear "Aggiungi scadenza"; with one, its date, repetition and reminder. Every row opens the
// "Scadenza" screen, which adds, changes or removes it.
export function DeadlineSection({ document }: { document: Pick<FamilyDocument, 'id' | 'expiresAt' | 'repeat' | 'reminderDays'> }) {
  const { defaultReminderDays } = usePreferences();
  const open = () => router.push({ pathname: '/deadline/[id]', params: { id: String(document.id) } });

  if (!document.expiresAt) {
    return (
      <Group title="Scadenza" footer="Con il promemoria sul telefono e, se attivo, nel calendario «Sottomano».">
        <Row label="Aggiungi scadenza" symbol="calendar.badge.plus" onPress={open} first />
      </Group>
    );
  }

  return (
    <Group title="Scadenza">
      <Row label="Scade il" symbol="calendar" value={formatDate(document.expiresAt)} onPress={open} first />
      <Row
        label="Si ripete"
        symbol="arrow.clockwise"
        value={document.repeat ? describeRepeat(document.repeat).replace('Si ripete ogni', 'Ogni') : 'Mai'}
        onPress={open}
      />
      <Row
        label="Promemoria"
        symbol="bell"
        value={reminderLabel(reminderPickerValue(document.reminderDays), defaultReminderDays)}
        onPress={open}
      />
    </Group>
  );
}
