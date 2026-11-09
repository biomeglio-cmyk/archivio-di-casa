import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ThemedText } from '@/components/themed-text';
import { listDocumentsWithExpiry } from '@/db/documents';
import { useDbQuery } from '@/hooks/use-db-query';
import { groupByDeadline } from '@/utils/deadlines';

// "/" route, the app opens here: upcoming deadlines in three sections
export default function DeadlinesScreen() {
  const { data: documents } = useDbQuery(listDocumentsWithExpiry, []);
  const sections = groupByDeadline(documents ?? []);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {documents && sections.length === 0 && (
        <ThemedText themeColor="textSecondary">Nessuna scadenza in arrivo.</ThemedText>
      )}

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.sectionTitle}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              {section.title}
            </ThemedText>
            {` · ${section.range}`}
          </ThemedText>
          {section.documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              href={{ pathname: '/(tabs)/(deadlines)/document/[id]', params: { id: String(doc.id) } }}
            />
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 24,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    paddingHorizontal: 4,
  },
});
