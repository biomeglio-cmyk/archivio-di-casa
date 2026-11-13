import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { FilesEditor, filesToSave, type EditableFile } from '@/components/files-editor';
import { Group, Row } from '@/components/grouped-list';
import { Switch } from '@/components/switch';
import { ThemedText } from '@/components/themed-text';
import { type Palette, Spacing } from '@/constants/theme';
import { getDocumentDetail, renewDocument } from '@/db/documents';
import type { DocumentDetail } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';
import { parseISODate, toISODate } from '@/utils/dates';
import { describeRepeat, nextOccurrence } from '@/utils/recurrence';
import { DateCalendar } from '@/components/date-calendar';

// Modal "Rinnovato", from the detail of a document with a deadline:
// - recurring deadline → it moves to the next occurrence (from the old deadline, past ones skipped);
// - otherwise → the user picks the new date (suggested: one year after the old one).
// Optional "Aggiungi la nuova scansione": the current pages become a "Versione precedente" and
// the new ones (scanner, photos, files: the "Aggiungi pagine" flow) become the current pages.
export default function RenewScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);

  return document?.expiresAt ? (
    <RenewContent document={document} expiresAt={document.expiresAt} />
  ) : (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button onPress={() => router.back()}>{t('common.cancel')}</Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function RenewContent({ document, expiresAt }: { document: DocumentDetail; expiresAt: string }) {
  const { t } = useI18n();
  const fmt = useFormat();
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const theme = useTheme();
  const { repeat } = document;
  const [pickedDate, setPickedDate] = useState(() =>
    parseISODate(nextOccurrence(expiresAt, { every: 1, unit: 'year' })),
  );
  const [withScan, setWithScan] = useState(false);
  const [pages, setPages] = useState<EditableFile[]>([]);
  const [saving, setSaving] = useState(false);

  const newExpiry = repeat ? nextOccurrence(expiresAt, repeat) : toISODate(pickedDate);
  const canSave = !saving && (!withScan || pages.length > 0);

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      await renewDocument(db, document.id, newExpiry, withScan ? filesToSave(pages).added : null);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert(t('renew.saveFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <ThemedText style={styles.intro}>{document.title}</ThemedText>

        <Group
          title={t('renew.deadline')}
          footer={repeat ? t('renew.repeatFooter', { repeat: describeRepeat(repeat) }) : undefined}>
          <Row label={t('renew.was')} symbol="calendar" value={fmt.date(expiresAt)} first />
          {repeat ? (
            <Row label={t('renew.newDeadline')} symbol="arrow.clockwise" value={fmt.date(newExpiry)} />
          ) : (
            <View style={[styles.pickerRow, { borderTopColor: theme.backgroundSelected }]}>
              <ThemedText>{t('renew.newDeadline')}</ThemedText>
              {/* Our calendar: Italian months, L M M G V S D, Monday first */}
              <View style={styles.calendar}>
                <DateCalendar value={pickedDate} onChange={setPickedDate} />
              </View>
            </View>
          )}
        </Group>

        <Group
          title={t('renew.newDocument')}
          footer={
            withScan
              ? t('renew.withScanFooter')
              : t('renew.withoutScanFooter')
          }>
          <Row label={t('renew.addNewScan')} symbol="doc.viewfinder" first>
            <Switch value={withScan} onValueChange={setWithScan} accessibilityLabel={t('renew.addNewScan')} />
          </Row>
        </Group>

        {withScan && <FilesEditor files={pages} category={document.category} onChange={setPages} autoAdd />}
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>{t('common.cancel')}</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={!canSave} onPress={save}>
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
    gap: 24,
  },
  intro: {
    paddingHorizontal: 4,
    fontWeight: 600,
  },
  pickerRow: {
    paddingTop: 14,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  calendar: {
    paddingBottom: 12,
  },
});
