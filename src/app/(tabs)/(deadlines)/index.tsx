import { ScrollView, StyleSheet, View } from 'react-native';

import { DocumentRow } from '@/components/document-row';
import { ThemedText } from '@/components/themed-text';
import { DOCUMENTS } from '@/data/documents';
import { groupByDeadline } from '@/utils/deadlines';

// "/" route, the app opens here: upcoming deadlines in three sections
export default function DeadlinesScreen() {
  const sections = groupByDeadline(DOCUMENTS);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      {sections.length === 0 && (
        <ThemedText themeColor="textSecondary">Nessuna scadenza in arrivo.</ThemedText>
      )}

      {sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
            {section.title}
          </ThemedText>
          {section.documents.map((doc) => (
            <DocumentRow
              key={doc.id}
              document={doc}
              href={{ pathname: '/(tabs)/(deadlines)/document/[id]', params: { id: doc.id } }}
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },
});
