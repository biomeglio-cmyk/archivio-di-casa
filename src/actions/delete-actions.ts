import { router } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

import { isOtherCategory } from '@/db/categories';
import { deletePerson } from '@/db/people';
import { moveToTrash, TRASH_DAYS } from '@/db/trash';

// Confirmation dialogs for destructive actions, shared by detail screens, swipe actions and menus.
// `onDeleted` runs only if the user confirmed and the deletion succeeded.

function showError(error: unknown) {
  Alert.alert('Impossibile eliminare', error instanceof Error ? error.message : String(error));
}

export function confirmDeleteDocument(
  db: SQLiteDatabase,
  document: { id: number; title: string },
  onDeleted?: () => void,
) {
  Alert.alert(
    `Spostare "${document.title}" nel Cestino?`,
    `Potrai ripristinarlo da Menu › Cestino per ${TRASH_DAYS} giorni, poi verrà eliminato con foto e PDF.`,
    [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Sposta nel Cestino',
        style: 'destructive',
        onPress: () => {
          moveToTrash(db, [document.id]).then(() => onDeleted?.(), showError);
        },
      },
    ],
  );
}

export function confirmDeletePerson(db: SQLiteDatabase, person: { id: number; name: string }, onDeleted?: () => void) {
  Alert.alert(`Eliminare ${person.name}?`, "I suoi documenti restano nell'app, senza persona.", [
    { text: 'Annulla', style: 'cancel' },
    {
      text: 'Elimina',
      style: 'destructive',
      onPress: () => {
        deletePerson(db, person.id).then(() => onDeleted?.(), showError);
      },
    },
  ]);
}

// "Cancella" on a category (built-in or custom; never "Altro"): the design dialog
// (src/app/delete-category/[id].tsx) with the choice "Spostali in Altro" / "Cancellali"
export function confirmDeleteCategory(category: { id: number; builtinKey: string | null }) {
  if (isOtherCategory(category)) {
    Alert.alert('Categoria "Altro"', 'Non si può eliminare: accoglie i documenti delle categorie eliminate.');
    return;
  }
  router.push({ pathname: '/delete-category/[id]', params: { id: String(category.id) } });
}
