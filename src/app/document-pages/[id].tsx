import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

import { FilesEditor, filesToSave, fromExisting, type EditableFile } from '@/components/files-editor';
import { type Palette, Spacing } from '@/constants/theme';
import { getDocumentDetail, listDocumentFiles, saveDocumentPages } from '@/db/documents';
import type { DocumentDetail, DocumentFile } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useThemedStyles } from '@/hooks/use-theme';

// Modal "Pagine", from "Aggiungi pagine" in the document detail: the same pages editor as
// "Nuovo documento" (Scansiona, Dalle foto, ✕, ‹ ›), with no limit on the number of pages.
// The new pages go at the end; nothing is saved until "Salva".
export default function DocumentPagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);
  const { data: files } = useDbQuery((db) => listDocumentFiles(db, documentId), [documentId]);

  // The editor reads the saved pages once, so it is shown only after loading
  return document && files ? (
    <PagesContent document={document} savedFiles={files} />
  ) : (
    <Stack.Toolbar placement="left">
      <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
    </Stack.Toolbar>
  );
}

function PagesContent({ document, savedFiles }: { document: DocumentDetail; savedFiles: DocumentFile[] }) {
  const styles = useThemedStyles(makeStyles);
  const db = useSQLiteContext();
  const [files, setFiles] = useState<EditableFile[]>(() => savedFiles.map(fromExisting));
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const kept = new Set(files.flatMap((f) => (f.existing ? [f.existing.id] : [])));
      const removed = savedFiles.filter((f) => !kept.has(f.id));
      const { added, moved } = filesToSave(files);
      await saveDocumentPages(db, document.id, removed, added, moved);
      router.back();
    } catch (error) {
      setSaving(false);
      Alert.alert('Impossibile salvare le pagine', error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <FilesEditor files={files} category={document.category} onChange={setFiles} autoAdd />
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  content: {
    paddingVertical: 16,
    paddingHorizontal: Spacing.side,
    paddingBottom: 48,
  },
});
