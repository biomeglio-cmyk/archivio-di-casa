import { router } from 'expo-router';

import { Group, Row } from '@/components/grouped-list';
import { reminderLabel, reminderPickerValue } from '@/constants/deadline-options';
import type { FamilyDocument } from '@/db/types';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import { usePreferences } from '@/settings/preferences';
import { describeEvery } from '@/utils/recurrence';

// "Scadenza" in the detail of every document (and card), always visible: without a deadline a
// clear "Aggiungi scadenza"; with one, its date, repetition and reminder. Every row opens the
// "Scadenza" screen, which adds, changes or removes it.
export function DeadlineSection({ document }: { document: Pick<FamilyDocument, 'id' | 'expiresAt' | 'repeat' | 'reminderDays'> }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const { defaultReminderDays } = usePreferences();
  const open = () => router.push({ pathname: '/deadline/[id]', params: { id: String(document.id) } });

  if (!document.expiresAt) {
    return (
      <Group title={t('deadlineSection.title')} footer={t('deadlineSection.emptyFooter')}>
        <Row label={t('deadlineSection.add')} symbol="calendar.badge.plus" onPress={open} first />
      </Group>
    );
  }

  return (
    <Group title={t('deadlineSection.title')}>
      <Row label={t('deadlineSection.expiresOn')} symbol="calendar" value={fmt.date(document.expiresAt)} onPress={open} first />
      <Row
        label={t('deadlineSection.repeats')}
        symbol="arrow.clockwise"
        value={document.repeat ? describeEvery(document.repeat) : t('deadlineSection.never')}
        onPress={open}
      />
      <Row
        label={t('deadlineSection.reminder')}
        symbol="bell"
        value={reminderLabel(reminderPickerValue(document.reminderDays), defaultReminderDays)}
        onPress={open}
      />
    </Group>
  );
}
