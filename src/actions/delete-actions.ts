import { router } from 'expo-router';
import { Alert } from 'react-native';

import { isOtherCategory } from '@/db/categories';

// Confirmation dialogs for destructive actions, shared by detail screens, swipe actions and menus.
// `onDeleted` runs only if the user confirmed and the deletion succeeded.

// "Cancella" on a document: the design dialog (src/app/delete-document/[id].tsx); it goes to the Cestino
export function confirmDeleteDocument(document: { id: number }) {
  router.push({ pathname: '/delete-document/[id]', params: { id: String(document.id) } });
}

// "Cancella persona": the design dialog (src/app/delete-person/[id].tsx) with the choice
// "Passali a Tutta la famiglia" / "Cancellali" (to the Cestino)
export function confirmDeletePerson(person: { id: number }) {
  router.push({ pathname: '/delete-person/[id]', params: { id: String(person.id) } });
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
