import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { PersonRow } from '@/components/person-row';
import { ThemedText } from '@/components/themed-text';
import { listPeopleWithCounts } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';

// "/family": the family members
export default function FamilyScreen() {
  const { data: people } = useDbQuery(listPeopleWithCounts, []);

  return (
    <>
      {/* The ScrollView must be the first child, so the large title collapses on scroll */}
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
        {people?.length === 0 && (
          <ThemedText themeColor="textSecondary">Nessuna persona. Aggiungila con il pulsante +.</ThemedText>
        )}

        {people?.map((person) => (
          <PersonRow key={person.id} person={person} documentCount={person.documentCount} />
        ))}
      </ScrollView>

      {/* Native "+" button on the right of the header, like Contacts or Reminders */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="plus" onPress={() => router.push('/new-person')} />
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
});
