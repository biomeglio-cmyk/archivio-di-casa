import { ScrollView, StyleSheet } from 'react-native';

import { PersonRow } from '@/components/person-row';
import { getDocumentsByPerson } from '@/data/documents';
import { PEOPLE } from '@/data/people';

// "/family": the family members
export default function FamilyScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      {PEOPLE.map((person) => (
        <PersonRow
          key={person.id}
          person={person}
          documentCount={getDocumentsByPerson(person.id).length}
        />
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
