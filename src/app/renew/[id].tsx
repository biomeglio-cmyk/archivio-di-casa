import { Host, Switch } from '@expo/ui';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { FilesEditor, filesToSave, type EditableFile } from '@/components/files-editor';
import { Group, Row } from '@/components/grouped-list';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { Spacing } from '@/constants/theme';
import { getDocumentDetail, renewDocument } from '@/db/documents';
import type { DocumentDetail } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, parseISODate, toISODate } from '@/utils/dates';
import { describeRepeat, nextOccurrence } from '@/utils/recurrence';

// Modal "Rinnovato", from the detail of a document with a deadline:
// - recurring deadline → it moves to the next occurrence (from the old deadline, past ones skipped);
// - otherwise → the user picks the new date (suggested: one year after the old one).
// Optional "Aggiungi la nuova scansione": the current pages become a "Versione precedente" and
// the new ones (scanner, photos, files: the "Aggiungi pagine" flow) become the current pages.
export default function RenewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);

  return document?.expiresAt ? (
    <RenewContent document={document} expiresAt={document.expiresAt} />
  ) : (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function RenewContent({ document, expiresAt }: { document: DocumentDetail; expiresAt: string }) {
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
      Alert.alert('Impossibile salvare', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <ThemedText style={styles.intro}>{document.title}</ThemedText>

        <Group title="Scadenza" footer={repeat ? `${describeRepeat(repeat)}: la nuova data è calcolata da quella vecchia.` : undefined}>
          <Row label="Era" symbol="calendar" value={formatDate(expiresAt)} first />
          {repeat ? (
            <Row label="Nuova scadenza" symbol="arrow.clockwise" value={formatDate(newExpiry)} />
          ) : (
            <View style={[styles.pickerRow, { borderTopColor: theme.backgroundSelected }]}>
              <ThemedText>Nuova scadenza</ThemedText>
              {/* Not inside another Host: this component creates its own, sized to the card */}
              <DateTimePicker
                value={pickedDate}
                onValueChange={(_, date) => setPickedDate(date)}
                mode="date"
                display="inline"
                accentColor={BRAND_COLOR}
                style={styles.calendar}
              />
            </View>
          )}
        </Group>

        <Group
          title="Nuovo documento"
          footer={
            withScan
              ? 'Le pagine di adesso diventano una «Versione precedente», che trovi nel dettaglio.'
              : 'Accendilo se hai il documento nuovo da scansionare.'
          }>
          <Row label="Aggiungi la nuova scansione" symbol="doc.viewfinder" first>
            <Host matchContents>
              <Switch value={withScan} onValueChange={setWithScan} />
            </Host>
          </Row>
        </Group>

        {withScan && <FilesEditor files={pages} category={document.category} onChange={setPages} autoAdd />}
      </ScrollView>

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" disabled={!canSave} onPress={save}>
          Salva
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
    alignSelf: 'stretch', // full width of the card, never past its margins
    marginBottom: 8,
  },
});
