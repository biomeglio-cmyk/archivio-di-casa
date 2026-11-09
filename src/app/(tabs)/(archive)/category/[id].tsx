import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ThemedText } from '@/components/themed-text';
import { getCategory } from '@/db/categories';
import { listDocumentsByCategory } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';

// "/category/[id]": documents of one category
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const categoryId = Number(id);
  const { data: category } = useDbQuery((db) => getCategory(db, categoryId), [categoryId]);
  const { data: documents } = useDbQuery((db) => listDocumentsByCategory(db, categoryId), [categoryId]);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      <Stack.Screen options={{ title: category?.name ?? '' }} />

      {documents?.length === 0 && (
        <ThemedText themeColor="textSecondary">Nessun documento in questa categoria.</ThemedText>
      )}

      {documents?.map((doc) => (
        <DocumentRow
          key={doc.id}
          document={doc}
          href={{ pathname: '/(tabs)/(archive)/document/[id]', params: { id: String(doc.id) } }}
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
