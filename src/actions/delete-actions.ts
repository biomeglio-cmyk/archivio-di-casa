import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

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
  Alert.alert(`Eliminare ${person.name}?`, 'I suoi documenti restano in archivio, senza persona.', [
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
