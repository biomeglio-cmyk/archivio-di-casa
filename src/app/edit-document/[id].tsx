import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { StyleSheet, View } from 'react-native';

import { DangerButton } from '@/components/danger-button';
import { DocumentForm } from '@/components/document-form';
import { confirmDeleteDocument } from '@/actions/delete-actions';
import { getDocumentDetail, updateDocument } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';

// Modal "Modifica documento": the same form as "Nuovo documento", already filled in
export default function EditDocumentScreen() {
  const db = useSQLiteContext();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);
  const { data: document } = useDbQuery((db) => getDocumentDetail(db, documentId), [documentId]);

  return (
    <>
      {/* The form reads its initial values once, so it is shown only after loading */}
      {document && (
        <DocumentForm
          initial={document}
          onSubmit={async (input) => {
            await updateDocument(db, documentId, input);
            router.back();
          }}
          footer={
            <View style={styles.delete}>
              <DangerButton
                label="Elimina documento"
                onPress={() => confirmDeleteDocument(db, document, () => router.back())}
              />
            </View>
          }
        />
      )}

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button onPress={() => router.back()}>Annulla</Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  delete: {
    marginTop: 12,
  },
});
