import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';

import { confirmDeleteCategory } from '@/actions/delete-actions';
import { DetailActionBar } from '@/components/detail-action-bar';
import { DocumentGrid } from '@/components/document-grid';
import { BRAND_COLOR } from '@/constants/brand';
import { getCategory } from '@/db/categories';
import { listDocumentsByCategory } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useDocumentSelection } from '@/hooks/use-document-selection';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';

// "/category/[id]": documents of one category as tiles. "Seleziona" picks several to send as one PDF.
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { data: category } = useDbQuery((db) => getCategory(db, categoryId), [categoryId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByCategory(db, categoryId), [categoryId]);
  const selection = useDocumentSelection();
  const db = useSQLiteContext();

  // Deleted with "Cancella" → back to Archivio
  useLeaveWhenDeleted(category);

  // Selected documents in list order, so the PDF pages follow the grid
  const selectedIds = (documents ?? []).filter((d) => selection.selected.has(d.id)).map((d) => d.id);

  function sendTogether() {
    router.push({ pathname: '/send', params: { ids: selectedIds.join(','), label: category?.name ?? '' } });
    selection.cancel();
  }

  return (
    <>
      <Stack.Screen options={{ title: category?.name ?? '' }} />

      <DocumentGrid
        documents={documents}
        hrefFor={(doc) => ({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(doc.id) } })}
        selection={selection}
        onAdd={() => router.push({ pathname: '/new-document', params: { categoryId: String(categoryId) } })}
        footer={
          // Built-in categories can't be edited or deleted; custom ones only deleted when empty
          category && documents && !selection.selecting ? (
            <DetailActionBar
              onAdd={null}
              onEdit={
                category.isBuiltin
                  ? null
                  : () => router.push({ pathname: '/category-form', params: { id: String(categoryId) } })
              }
              onDelete={!category.isBuiltin && documents.length === 0 ? () => confirmDeleteCategory(db, category) : null}
            />
          ) : null
        }
      />

      {/* Header: "Seleziona", or "Annulla" while selecting */}
      <Stack.Toolbar placement="right">
        {selection.selecting ? (
          <Stack.Toolbar.Button onPress={selection.cancel}>Annulla</Stack.Toolbar.Button>
        ) : (
          <Stack.Toolbar.Button onPress={selection.start} disabled={!documents?.length}>
            Seleziona
          </Stack.Toolbar.Button>
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
