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
import { useI18n } from '@/i18n';
import { deletePassword } from '@/security/password-vault';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type Choice = 'move' | 'trash';

// "Cancella categoria" (docs/design/CancellaCategoria.dc.html), a transparent route over the screen
// that opened it. With documents inside: move them to "Altro" (default) or delete them too; deleted
// documents go to our Cestino (recoverable for 30 days), never straight away. "Altro" can't be
// deleted (its "…" never offers it). A built-in category (Tessere e card, Password… with their own
// forms) is only hidden: Nuova categoria › "Ripristina una categoria predefinita" brings it back.
export default function DeleteCategoryScreen() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
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
      Alert.alert(t('deleteCategory.deleteFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  // A built-in is only hidden: it comes back from Nuova categoria › "Ripristina una categoria predefinita"
  const message = count
    ? t(category.isBuiltin ? 'deleteCategory.messageWithDocumentsRestorable' : 'deleteCategory.messageWithDocuments', { count })
    : t(category.isBuiltin ? 'deleteCategory.messageEmptyRestorable' : 'deleteCategory.messageEmpty');

  return (
    <ConfirmDialog
      title={t('deleteCategory.title', { name: category.name })}
      message={message}
      confirmLabel={count && choice === 'trash' ? t('deleteCategory.deleteAll') : t('deleteCategory.confirm')}
      onConfirm={confirm}
      onCancel={() => router.back()}
      busy={busy}>
      {count ? (
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={t('deleteCategory.choicesA11y')}>
          <ConfirmChoice
            label={t('deleteCategory.moveLabel')}
            detail={
              category.isPassword
                ? t('deleteCategory.moveDetailPassword')
                : t('deleteCategory.moveDetail')
            }
            checked={choice === 'move'}
            onPress={() => setChoice('move')}
          />
          <ConfirmChoice
            label={t('deleteCategory.trashLabel')}
            detail={t('deleteCategory.trashDetail', { count: TRASH_DAYS })}
            checked={choice === 'trash'}
            onPress={() => setChoice('trash')}
          />
        </View>
      ) : null}
    </ConfirmDialog>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  fill: {
    flex: 1,
  },
  choices: {
    marginTop: 16,
    alignSelf: 'stretch',
    gap: 8,
  },
});
