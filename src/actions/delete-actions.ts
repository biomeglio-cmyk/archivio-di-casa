import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

import { countDocumentsInCategory, deleteCategory } from '@/db/categories';
import { deleteDocument } from '@/db/documents';
import { deletePerson } from '@/db/people';

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
    `Eliminare "${document.title}"?`,
    'Verranno eliminati anche le foto e i PDF collegati. Non si può annullare.',
    [
      { text: 'Annulla', style: 'cancel' },
      {
        text: 'Elimina',
        style: 'destructive',
        onPress: () => {
          deleteDocument(db, document.id).then(() => onDeleted?.(), showError);
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

// Custom categories only, and only when empty (checked again here, right before deleting)
export async function confirmDeleteCategory(
  db: SQLiteDatabase,
  category: { id: number; name: string; isBuiltin: boolean },
  onDeleted?: () => void,
) {
  if (category.isBuiltin) {
    Alert.alert('Categoria di base', 'Le categorie di base si possono rinominare ma non eliminare.');
    return;
  }
  const count = await countDocumentsInCategory(db, category.id);
  if (count > 0) {
    Alert.alert(
      'Categoria non vuota',
      `"${category.name}" contiene ${count === 1 ? '1 documento' : `${count} documenti`}. Spostali in un'altra categoria prima di eliminarla.`,
    );
    return;
  }
  Alert.alert(`Eliminare "${category.name}"?`, 'La categoria è vuota.', [
    { text: 'Annulla', style: 'cancel' },
    {
      text: 'Elimina',
      style: 'destructive',
      onPress: () => {
        deleteCategory(db, category.id).then(() => onDeleted?.(), showError);
      },
    },
  ]);
}
