import type { SQLiteDatabase } from 'expo-sqlite';
import { Alert } from 'react-native';

import {
  countDocumentsInCategory,
  deleteCategory,
  isOtherCategory,
  listDocumentIdsInCategory,
  moveDocumentsToOther,
} from '@/db/categories';
import { deleteDocument } from '@/db/documents';
import { deletePerson } from '@/db/people';
import { deletePassword } from '@/security/password-vault';

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

// "Cancella" on a category (built-in or custom; never "Altro"). Empty: one confirmation.
// With documents: move them to "Altro" (the suggested choice) or delete them too, after a second
// confirmation. A built-in category is only hidden: "Ripristina categorie predefinite" in Aspetto
// brings it back.
export async function confirmDeleteCategory(
  db: SQLiteDatabase,
  category: { id: number; name: string; isBuiltin: boolean; isPassword: boolean; builtinKey: string | null },
  onDeleted?: () => void,
) {
  if (isOtherCategory(category)) {
    Alert.alert('Categoria "Altro"', 'Non si può eliminare: accoglie i documenti delle categorie eliminate.');
    return;
  }
  const finish = () => deleteCategory(db, category.id).then(() => onDeleted?.(), showError);
  const restorable = category.isBuiltin ? ' Potrai ripristinarla da Menu › Aspetto.' : '';
  const count = await countDocumentsInCategory(db, category.id);

  if (count === 0) {
    Alert.alert(`Eliminare "${category.name}"?`, `La categoria è vuota.${restorable}`, [
      { text: 'Annulla', style: 'cancel' },
      { text: 'Elimina', style: 'destructive', onPress: finish },
    ]);
    return;
  }

  const some = count === 1 ? '1 documento' : `${count} documenti`;
  const passwordsNote = category.isPassword ? ' Le password salvate verranno tolte dal Portachiavi.' : '';

  // Option 1: documents to "Altro". From "Password", the passwords leave the Keychain
  // (in "Altro" there is no password field to show them).
  async function moveToOther() {
    try {
      const moved = await moveDocumentsToOther(db, category.id);
      if (category.isPassword) for (const id of moved) await deletePassword(id);
      await finish();
    } catch (error) {
      showError(error);
    }
  }

  // Option 2: documents deleted too (files, calendar events, reminders, favorites, passwords)
  function deleteAll() {
    Alert.alert(
      `Cancellare anche ${some}?`,
      `Verranno eliminati con foto e PDF.${passwordsNote} Non si può annullare.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Cancella tutto',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const id of await listDocumentIdsInCategory(db, category.id)) await deleteDocument(db, id);
              await finish();
            } catch (error) {
              showError(error);
            }
          },
        },
      ],
    );
  }

  Alert.alert(`Eliminare "${category.name}"?`, `Contiene ${some}.${restorable}`, [
    {
      text: count === 1 ? 'Sposta il documento in Altro' : `Sposta i ${count} documenti in Altro`,
      isPreferred: true,
      onPress: () => {
        if (!category.isPassword) {
          moveToOther();
          return;
        }
        Alert.alert('Spostare in Altro?', `I documenti restano; nome utente e password vengono tolti.${passwordsNote}`, [
          { text: 'Annulla', style: 'cancel' },
          { text: 'Sposta', style: 'destructive', onPress: moveToOther },
        ]);
      },
    },
    { text: 'Cancella anche i documenti', style: 'destructive', onPress: deleteAll },
    { text: 'Annulla', style: 'cancel' },
  ]);
}
