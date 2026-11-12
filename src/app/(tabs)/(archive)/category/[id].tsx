import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert } from 'react-native';

import { confirmDeleteCategory } from '@/actions/delete-actions';
import { CardGrid } from '@/components/card-grid';
import { FolderScreen } from '@/components/folder-screen';
import { getCategory } from '@/db/categories';
import { listDocumentsByCategory, saveDocumentOrder } from '@/db/documents';
import type { DocumentListItem } from '@/db/types';
import { useDbQuery } from '@/hooks/use-db-query';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';

// "/category/[id]": a folder (FolderScreen, docs/design/Archivio.dc.html); "Tessere e card" stays a
// wallet of card-shaped tiles until its own redesign step.
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { data: category } = useDbQuery((db) => getCategory(db, categoryId), [categoryId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByCategory(db, categoryId), [categoryId]);
  const db = useSQLiteContext();

  // Deleted with "Cancella" → back to Home
  useLeaveWhenDeleted(category);

  // "Tessere e card": a wallet of card-shaped tiles, with the native header and its "…" menu
  if (category?.isCards) {
    const saveOrder = async (items: DocumentListItem[]) => {
      try {
        await saveDocumentOrder(db, 'category', items.map((d) => d.id));
      } catch (error) {
        Alert.alert('Impossibile salvare l’ordine', error instanceof Error ? error.message : String(error));
      }
    };
    return (
      <>
        <Stack.Screen options={{ title: category.name }} />
        <CardGrid
          cards={documents}
          hrefFor={(card) => ({ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(card.id) } })}
          onReorder={saveOrder}
        />
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon="ellipsis" accessibilityLabel="Altre azioni">
            <Stack.Toolbar.MenuAction
              icon="pencil"
              onPress={() => router.push({ pathname: '/category-form', params: { id: String(categoryId) } })}>
              Modifica categoria
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="trash" destructive onPress={() => confirmDeleteCategory(category)}>
              Cancella categoria
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </>
    );
  }

  // Every other category: the folder of the design (it draws its own header)
  return (
    <>
      <Stack.Screen options={{ title: category?.name ?? '', headerShown: false }} />
      {category && documents && <FolderScreen category={category} documents={documents} />}
    </>
  );
}
