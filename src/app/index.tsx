import { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CategoryCard } from '@/components/category-card';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES } from '@/constants/categories';
import { BottomTabInset, Spacing } from '@/constants/theme';

export default function HomeScreen() {
  // The id of the selected category (null = nothing selected)
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Find the full category object from its id, to show its name
  const selectedCategory = CATEGORIES.find((c) => c.id === selectedId);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.list}>
          <ThemedText type="title">Sottomano</ThemedText>

          <ThemedText type="small">
            {selectedCategory
              ? `Selezionata: ${selectedCategory.name}`
              : 'Tocca una categoria'}
          </ThemedText>

          {CATEGORIES.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              selected={category.id === selectedId}
              onPress={() => setSelectedId(category.id)}
            />
          ))}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
});