import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { CardsScreen } from '@/components/cards-screen';
import { FolderScreen } from '@/components/folder-screen';
import { getCategory } from '@/db/categories';
import { listDocumentsByCategory } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { useLeaveWhenDeleted } from '@/hooks/use-leave-when-deleted';

// "/category/[id]": a folder (FolderScreen, docs/design/Archivio.dc.html), or the wallet of
// "Tessere e card" (CardsScreen, docs/design/Tessere.dc.html)
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { data: category } = useDbQuery((db) => getCategory(db, categoryId), [categoryId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByCategory(db, categoryId), [categoryId]);

  // Deleted with "Cancella" → back to Home
  useLeaveWhenDeleted(category);

  // "Tessere e card": the wallet of the Tessere design (it draws its own header)
  if (category?.isCards) {
    return (
      <>
        <Stack.Screen options={{ title: category.name, headerShown: false }} />
        {documents && <CardsScreen category={category} cards={documents} />}
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
