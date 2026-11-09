import { ScrollView, StyleSheet } from 'react-native';

import { PersonRow } from '@/components/person-row';
import { ThemedText } from '@/components/themed-text';
import { listPeopleWithCounts } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';

// "/family": the family members
export default function FamilyScreen() {
  const { data: people } = useDbQuery(listPeopleWithCounts, []);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      {people?.length === 0 && (
        <ThemedText themeColor="textSecondary">Nessuna persona. Aggiungila con il pulsante +.</ThemedText>
      )}

      {people?.map((person) => (
        <PersonRow key={person.id} person={person} documentCount={person.documentCount} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
});
