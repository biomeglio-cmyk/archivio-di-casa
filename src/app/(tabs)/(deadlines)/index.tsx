import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// "/" route: the app opens here. Content arrives in step 5.
export default function DeadlinesScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ThemedText themeColor="textSecondary">Qui arriveranno le scadenze.</ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
