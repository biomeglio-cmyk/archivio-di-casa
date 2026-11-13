import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ConfirmChoice, ConfirmDialog } from '@/components/confirm-dialog';
import { countDocumentsOfPerson, deletePerson, getPerson } from '@/db/people';
import { TRASH_DAYS } from '@/db/trash';
import { useDbQuery } from '@/hooks/use-db-query';
import { useI18n } from '@/i18n';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type Choice = 'family' | 'trash';

// "Cancella persona" (docs/design/CancellaPersona.dc.html), a transparent route over the screen that
// opened it. With documents: pass them to "Tutta la famiglia" (default) or delete them too; deleted
// documents go to our Cestino (recoverable for 30 days), never straight away.
export default function DeletePersonScreen() {
  const { t } = useI18n();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const db = useSQLiteContext();
  const { data: person } = useDbQuery((d) => getPerson(d, personId), [personId]);
  const { data: count } = useDbQuery((d) => countDocumentsOfPerson(d, personId), [personId]);
  const [choice, setChoice] = useState<Choice>('family');
  const [busy, setBusy] = useState(false);

  if (!person || count === undefined) return <View style={styles.fill} />;

  async function confirm() {
    if (!person) return;
    setBusy(true);
    try {
      await deletePerson(db, person.id, count && choice === 'trash' ? 'trash' : 'family');
      router.back();
    } catch (error) {
      setBusy(false);
      Alert.alert(t('deleteCategory.deleteFailed'), error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <ConfirmDialog
      title={t('deletePerson.title', { name: person.name })}
      message={count ? t('deletePerson.messageWithDocuments', { name: person.name, count }) : t('deletePerson.messageEmpty')}
      confirmLabel={count && choice === 'trash' ? t('deleteCategory.deleteAll') : t('personScreen.deletePerson')}
      symbol="person.crop.circle.badge.minus"
      onConfirm={confirm}
      onCancel={() => router.back()}
      busy={busy}>
      {count ? (
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel={t('deleteCategory.choicesA11y')}>
          <ConfirmChoice
            label={t('deletePerson.familyLabel')}
            detail={t('deletePerson.familyDetail')}
            checked={choice === 'family'}
            onPress={() => setChoice('family')}
          />
          <ConfirmChoice
            label={t('deleteCategory.trashLabel')}
            detail={t('deletePerson.trashDetail', { count: TRASH_DAYS })}
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
