import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ThemedText } from '@/components/themed-text';
import { listDocumentsByPerson } from '@/db/documents';
import { getPerson } from '@/db/people';
import { useDbQuery } from '@/hooks/use-db-query';

// "/person/[id]": documents of one family member
export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const personId = Number(id);
  const { data: person } = useDbQuery((db) => getPerson(db, personId), [personId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByPerson(db, personId), [personId]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      <Stack.Screen options={{ title: person?.name ?? '' }} />

      {documents?.length === 0 && (
        <ThemedText themeColor="textSecondary">Nessun documento per questa persona.</ThemedText>
      )}

      {documents?.map((doc) => (
        <DocumentRow
          key={doc.id}
          document={doc}
          href={{ pathname: '/(tabs)/(family)/document/[id]', params: { id: String(doc.id) } }}
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
