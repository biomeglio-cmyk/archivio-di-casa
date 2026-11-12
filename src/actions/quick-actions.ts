import { router, type Href } from 'expo-router';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { SFSymbol } from 'expo-symbols';

import { confirmDeleteCategory, confirmDeleteDocument, confirmDeletePerson } from '@/actions/delete-actions';
import { isOtherCategory } from '@/db/categories';
import { setPinned } from '@/db/documents';
import type { Category, DocumentListItem, Person } from '@/db/types';

// One entry of the quick-action menu (long press on a tile) and of the VoiceOver actions
export type QuickAction = {
  key: string; // stable id, also the VoiceOver action name
  label: string;
  symbol: SFSymbol;
  destructive?: boolean; // red, always last
  onPress: () => void;
};

// Documents and cards: Apri, preferiti, Modifica, Sposta nel cestino (same flows as the detail)
export function documentQuickActions(db: SQLiteDatabase, document: DocumentListItem, href: Href): QuickAction[] {
  const editPath = document.category.isCards ? '/edit-card/[id]' : '/edit-document/[id]';
  return [
    { key: 'open', label: 'Apri', symbol: 'arrow.up.forward.app', onPress: () => router.push(href) },
    {
      key: 'pin',
      label: document.isPinned ? 'Togli dai preferiti' : 'Aggiungi ai preferiti',
      symbol: document.isPinned ? 'heart.slash' : 'heart',
      onPress: () => void setPinned(db, document.id, !document.isPinned),
    },
    {
      key: 'edit',
      label: 'Modifica',
      symbol: 'pencil',
      onPress: () => router.push({ pathname: editPath, params: { id: String(document.id) } }),
    },
    {
      key: 'trash',
      label: 'Sposta nel cestino',
      symbol: 'trash',
      destructive: true,
      onPress: () => confirmDeleteDocument(document),
    },
  ];
}

// Categories on Home: Apri, Modifica categoria, Cancella categoria (never for "Altro")
export function categoryQuickActions(db: SQLiteDatabase, category: Category): QuickAction[] {
  const actions: QuickAction[] = [
    {
      key: 'open',
      label: 'Apri',
      symbol: 'arrow.up.forward.app',
      onPress: () => router.push({ pathname: '/category/[id]', params: { id: String(category.id) } }),
    },
    {
      key: 'edit',
      label: 'Modifica categoria',
      symbol: 'pencil',
      onPress: () => router.push({ pathname: '/category-form', params: { id: String(category.id) } }),
    },
  ];
  if (!isOtherCategory(category)) {
    actions.push({
      key: 'delete',
      label: 'Cancella categoria',
      symbol: 'trash',
      destructive: true,
      onPress: () => confirmDeleteCategory(category),
    });
  }
  return actions;
}

// People in Famiglia: Apri, Modifica, Elimina
export function personQuickActions(db: SQLiteDatabase, person: Person): QuickAction[] {
  return [
    {
      key: 'open',
      label: 'Apri',
      symbol: 'arrow.up.forward.app',
      onPress: () => router.push({ pathname: '/person/[id]', params: { id: String(person.id) } }),
    },
    {
      key: 'edit',
      label: 'Modifica',
      symbol: 'pencil',
      onPress: () => router.push({ pathname: '/person-form', params: { id: String(person.id) } }),
    },
    {
      key: 'delete',
      label: 'Elimina',
      symbol: 'trash',
      destructive: true,
      onPress: () => confirmDeletePerson(db, person),
    },
  ];
}

// The same actions for VoiceOver ("Azioni" rotor). "activate" stays the tap (Apri).
export function accessibilityActionsOf(actions: QuickAction[]) {
  return actions.filter((a) => a.key !== 'open').map((a) => ({ name: a.key, label: a.label }));
}

export function runAccessibilityAction(actions: QuickAction[], name: string): boolean {
  const action = actions.find((a) => a.key === name);
  action?.onPress();
  return action !== undefined;
}
