import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { getCategory } from '@/db/categories';
import { listDocumentsByCategory } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';

// "/category/[id]": documents of one category. "Seleziona" picks several to send as one PDF.
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { data: category } = useDbQuery((db) => getCategory(db, categoryId), [categoryId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByCategory(db, categoryId), [categoryId]);
  const selection = useDocumentSelection();

  // Deleted from "Modifica categoria" → back to Archivio
  useLeaveWhenDeleted(category);

  // Selected documents in list order, so the PDF pages follow the list
  const selectedIds = (documents ?? []).filter((d) => selection.selected.has(d.id)).map((d) => d.id);

  function sendTogether() {
    router.push({ pathname: '/send', params: { ids: selectedIds.join(','), label: category?.name ?? '' } });
    selection.cancel();
  }

  return (
    <>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
        <Stack.Screen options={{ title: category?.name ?? '' }} />

        {documents?.length === 0 && (
          <ThemedText themeColor="textSecondary">Nessun documento in questa categoria.</ThemedText>
        )}

        {documents?.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            href={{ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(doc.id) } }}
            selection={
              selection.selecting
                ? {
                    selected: selection.selected.has(doc.id),
                    disabled: doc.imageCount === 0, // only photos can go into the combined PDF
                    onToggle: () => selection.toggle(doc.id),
                  }
                : undefined
            }
          />
        ))}
      </ScrollView>

      {/* Header: "Seleziona" and the pencil, or "Annulla" while selecting */}
      <Stack.Toolbar placement="right">
        {selection.selecting ? (
          <Stack.Toolbar.Button onPress={selection.cancel}>Annulla</Stack.Toolbar.Button>
        ) : (
          <>
            <Stack.Toolbar.Button onPress={selection.start} disabled={!documents?.length}>
              Seleziona
            </Stack.Toolbar.Button>
            <Stack.Toolbar.Button
              icon="pencil"
              onPress={() => router.push({ pathname: '/category-form', params: { id: String(categoryId) } })}
            />
          </>
        )}
      </Stack.Toolbar>

      {selection.selecting && (
        <Stack.Toolbar placement="bottom">
          <Stack.Toolbar.Button
            variant="prominent"
            tintColor={BRAND_COLOR}
            disabled={selectedIds.length === 0}
            onPress={sendTogether}>
            {`Invia insieme (${selectedIds.length})`}
          </Stack.Toolbar.Button>
        </Stack.Toolbar>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
});
