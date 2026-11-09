import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ScrollView, StyleSheet } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ThemedText } from '@/components/themed-text';
import { getCategory } from '@/constants/categories';
import { getDocumentsByCategory } from '@/data/documents';

// "/category/[id]": documents of one category
export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = getCategory(id);
  const documents = getDocumentsByCategory(id);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.list}>
      <Stack.Screen options={{ title: category?.name ?? 'Categoria' }} />

      {documents.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nessun documento in questa categoria.</ThemedText>
      ) : (
        documents.map((doc) => (
          <DocumentRow
            key={doc.id}
            document={doc}
            href={{ pathname: '/(tabs)/(archive)/document/[id]', params: { id: doc.id } }}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 10,
  },
});
