import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  size: { width: number; height: number }; // same size as the category tiles
  onPress: () => void;
};

// Dashed tile at the end of the archive grid
export function NewCategoryTile({ size, onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.tile,
        size,
        { borderColor: theme.textSecondary },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <SymbolView name="plus" tintColor={theme.textSecondary} size={24} />
      <ThemedText themeColor="textSecondary" style={styles.label} numberOfLines={2}>
        Nuova categoria
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: 20,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
  },
  label: {
    fontSize: 15,
    textAlign: 'center',
  },
});
