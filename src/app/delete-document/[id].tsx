import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { getDocumentDetail } from '@/db/documents';
import { moveToTrash, TRASH_DAYS } from '@/db/trash';
import { useDbQuery } from '@/hooks/use-db-query';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useI18n } from '@/i18n';

// "Cancella documento" (docs/design/CancellaDocumento.dc.html), a transparent route over the screen
// that opened it. The document goes to our Cestino and can be recovered for 30 days (the design's
// "solo da un backup" does not apply: the Cestino wins).
export default function DeleteDocumentScreen() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const db = useSQLiteContext();
  const { data: document } = useDbQuery((d) => getDocumentDetail(d, documentId), [documentId]);
  const [busy, setBusy] = useState(false);

  if (!document) return <View style={styles.fill} />;

  async function confirm() {
    setBusy(true);
    try {
      await moveToTrash(db, [documentId]);
      router.back();
    } catch (error) {
      setBusy(false);
      Alert.alert(t('deleteDocument.deleteFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <ConfirmDialog
      title={t('deleteDocument.title', { title: document.title })}
      message={t('deleteDocument.message', { count: TRASH_DAYS })}
      confirmLabel={t('deleteDocument.confirm')}
      onConfirm={confirm}
      onCancel={() => router.back()}
      busy={busy}
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  fill: {
    flex: 1,
  },
});
