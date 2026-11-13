import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { ConfirmChoice, ConfirmDialog } from '@/components/confirm-dialog';
import { countDocumentsOfPerson, deletePerson, getPerson } from '@/db/people';
import { TRASH_DAYS } from '@/db/trash';
import { useDbQuery } from '@/hooks/use-db-query';
import { themedStyles } from '@/constants/theme';

type Choice = 'family' | 'trash';

// "Cancella persona" (docs/design/CancellaPersona.dc.html), a transparent route over the screen that
// opened it. With documents: pass them to "Tutta la famiglia" (default) or delete them too; deleted
// documents go to our Cestino (recoverable for 30 days), never straight away.
export default function DeletePersonScreen() {
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
      Alert.alert('Impossibile eliminare', error instanceof Error ? error.message : String(error));
    }
  }

  const some = count === 1 ? '1 documento' : `${count} documenti`;

  return (
    <ConfirmDialog
      title={`Togliere ${person.name} dalla famiglia?`}
      message={count ? `${person.name} ha ${some}. Cosa vuoi farne?` : 'Il profilo sparisce da questo telefono.'}
      confirmLabel={count && choice === 'trash' ? 'Cancella tutto' : 'Cancella persona'}
      symbol="person.crop.circle.badge.minus"
      onConfirm={confirm}
      onCancel={() => router.back()}
      busy={busy}>
      {count ? (
        <View style={styles.choices} accessibilityRole="radiogroup" accessibilityLabel="Cosa fare dei documenti">
          <ConfirmChoice
            label="Passali a Tutta la famiglia"
            detail="Restano nell’app, visibili a tutti"
            checked={choice === 'family'}
            onPress={() => setChoice('family')}
          />
          <ConfirmChoice
            label="Cancellali"
            detail={`Spariscono insieme al profilo: restano nel Cestino per ${TRASH_DAYS} giorni`}
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
