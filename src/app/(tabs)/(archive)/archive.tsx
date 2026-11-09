import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// "/archive" route. The category grid arrives in step 4.
export default function ArchiveScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ThemedText themeColor="textSecondary">Qui arriverà la griglia delle categorie.</ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
