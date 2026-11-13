import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { DocumentFilesView } from '@/components/document-files-view';
import { ThemedText } from '@/components/themed-text';
import { type Palette, Spacing } from '@/constants/theme';
import { getDocumentDetail, getDocumentVersion, listVersionFiles } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { toISODate } from '@/utils/dates';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';
import { useFormat } from '@/i18n/use-format';

// Modal "Versione precedente", from "Versioni precedenti" in the detail: the pages the document
// had before a "Rinnovato" with a new scan, with the deadline it had then. Read only.
export default function DocumentVersionScreen() {
  const { t } = useI18n();
  const fmt = useFormat();
  const styles = useThemedStyles(makeStyles);
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
            <ThemedText style={styles.title} accessibilityRole="header">
              {document.title}
            </ThemedText>
            <ThemedText themeColor="textSecondary">
              {[
                t('documentVersion.replacedOn', { date: fmt.date(toISODate(new Date(version.archivedAt))) }),
                version.expiresAt ? t('documentVersion.expiredOn', { date: fmt.date(version.expiresAt) }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </ThemedText>
            <DocumentFilesView title={t('documentVersion.previewTitle', { title: document.title })} category={document.category} files={files} />
          </>
        )}
      </ScrollView>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button variant="done" onPress={() => router.back()}>
          {t('common.done')}
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
    gap: 12,
  },
  title: {
    fontWeight: 600,
  },
});
