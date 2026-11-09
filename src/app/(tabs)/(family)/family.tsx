import { ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';

// "/family" route. Step, Mamma and Papà arrive in step 6.
export default function FamilyScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <ThemedText themeColor="textSecondary">Qui arriveranno Step, Mamma e Papà.</ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16 },
});
