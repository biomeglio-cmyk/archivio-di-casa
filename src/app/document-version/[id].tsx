import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { DocumentFilesView } from '@/components/document-files-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing, themedStyles } from '@/constants/theme';
import { getDocumentDetail, getDocumentVersion, listVersionFiles } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { formatDate, toISODate } from '@/utils/dates';

// Modal "Versione precedente", from "Versioni precedenti" in the detail: the pages the document
// had before a "Rinnovato" with a new scan, with the deadline it had then. Read only.
export default function DocumentVersionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const versionId = Number(id);
  const { data: version } = useDbQuery((db) => getDocumentVersion(db, versionId), [versionId]);
  const { data: files } = useDbQuery((db) => listVersionFiles(db, versionId), [versionId]);
  const documentId = version?.documentId ?? 0;
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        {version && document && files && (
          <>
            <ThemedText style={styles.title}>{document.title}</ThemedText>
            <ThemedText themeColor="textSecondary">
              {[
                `Sostituita il ${formatDate(toISODate(new Date(version.archivedAt)))}`,
                version.expiresAt ? `scadeva il ${formatDate(version.expiresAt)}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <DocumentFilesView title={`${document.title} (versione precedente)`} category={document.category} files={files} />
          </>
        )}
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          Fine
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
    gap: 12,
  },
  title: {
    fontWeight: 600,
  },
}));
