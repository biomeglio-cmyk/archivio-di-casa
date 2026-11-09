import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import type { Category } from '@/constants/categories';

type Props = {
  category: Category;
  selected?: boolean;    // is this card the selected one?
  onPress?: () => void;  // function called when the card is tapped
};

export function CategoryCard({ category, selected = false, onPress }: Props) {
  return (
    <Pressable onPress={onPress}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, selected && styles.selected]}>
        <SymbolView name={category.symbol} tintColor={category.colors.text} size={28} />
        <View style={styles.texts}>
          <ThemedText>{category.name}</ThemedText>
          <ThemedText type="small">{category.examples}</ThemedText>
        </View>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selected: {
    borderColor: '#208AEF',
  },
  texts: {
    flex: 1,
  },
});