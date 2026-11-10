import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  label: string; // "Nuova categoria", "Aggiungi persona"
  size: { width: number; height: number }; // same size as the other tiles of the grid
  onPress: () => void;
};

// Dashed tile at the end of a grid, to add a new item
export function DashedAddTile({ label, size, onPress }: Props) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      style={[
        size,
        styles.tile,
        { borderColor: theme.textSecondary },
        pressed && { backgroundColor: theme.backgroundElement },
      ]}>
      <SymbolView name="plus" tintColor={theme.textSecondary} size={24} />
      <ThemedText themeColor="textSecondary" style={styles.label} numberOfLines={2}>
        {label}
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
