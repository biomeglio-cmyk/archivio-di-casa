import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ConfirmChoice, ConfirmDialog } from '@/components/confirm-dialog';
import {
  countDocumentsInCategory,
  deleteCategory,
  getCategory,
  listDocumentIdsInCategory,
  moveDocumentsToOther,
} from '@/db/categories';
import { moveToTrash, TRASH_DAYS } from '@/db/trash';
import { useDbQuery } from '@/hooks/use-db-query';
import { deletePassword } from '@/security/password-vault';
import { themedStyles } from '@/constants/theme';

type Choice = 'move' | 'trash';

// "Cancella categoria" (docs/design/CancellaCategoria.dc.html), a transparent route over the screen
// that opened it. With documents inside: move them to "Altro" (default) or delete them too; deleted
// documents go to our Cestino (recoverable for 30 days), never straight away. "Altro" can't be
// deleted (its "…" never offers it). A built-in category (Tessere e card, Password… with their own
// forms) is only hidden: Nuova categoria › "Ripristina una categoria predefinita" brings it back.
export default function DeleteCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const db = useSQLiteContext();
  const { data: category } = useDbQuery((d) => getCategory(d, categoryId), [categoryId]);
  const { data: count } = useDbQuery((d) => countDocumentsInCategory(d, categoryId), [categoryId]);
  const [choice, setChoice] = useState<Choice>('move');
  const [busy, setBusy] = useState(false);

  if (!category || count === undefined) return <View style={styles.fill} />;

  async function confirm() {
    if (!category) return;
    setBusy(true);
    try {
      if (count && choice === 'move') {
        const moved = await moveDocumentsToOther(db, category.id);
        // From "Password": the passwords leave the Keychain ("Altro" has no field to show them)
        if (category.isPassword) for (const documentId of moved) await deletePassword(documentId);
      } else if (count) {
        await moveToTrash(db, await listDocumentIdsInCategory(db, category.id));
      }
      await deleteCategory(db, category.id);
      router.back();
    } catch (error) {
      setBusy(false);
      Alert.alert('Impossibile eliminare', error instanceof Error ? error.message : String(error));
    }
  }

  const some = count === 1 ? '1 documento' : `${count} documenti`;
  // A built-in is only hidden: it comes back from Nuova categoria › "Ripristina una categoria predefinita"
  const restorable = category.isBuiltin ? ' Potrai ripristinarla da Nuova categoria.' : '';

  return (
    <ConfirmDialog
      title={`Cancellare la categoria ${category.name}?`}
      message={count ? `Dentro ci sono ${some}. Cosa vuoi farne?${restorable}` : `La categoria è vuota.${restorable}`}
      confirmLabel={count && choice === 'trash' ? 'Cancella tutto' : 'Cancella la categoria'}
      onConfirm={confirm}
      onCancel={() => router.back()}
      busy={busy}>
      {count ? (
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Cosa fare dei documenti">
          <ConfirmChoice
            label="Spostali in Altro"
            detail={
              category.isPassword
                ? 'Restano nell’app, in Altro, senza nome utente e password'
                : 'Restano nell’app, in una cartella generica'
            }
            checked={choice === 'move'}
            onPress={() => setChoice('move')}
          />
          <ConfirmChoice
            label="Cancellali"
            detail={`Vanno nel Cestino: puoi recuperarli per ${TRASH_DAYS} giorni`}
            checked={choice === 'trash'}
            onPress={() => setChoice('trash')}
          />
        </View>
      ) : null}
    </ConfirmDialog>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  fill: {
    flex: 1,
  },
  choices: {
    marginTop: 16,
    alignSelf: 'stretch',
    gap: 8,
  },
}));
