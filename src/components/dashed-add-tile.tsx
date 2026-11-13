import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { useIconRow } from '@/components/icon-row';
import { NoBreakText } from '@/components/tile-title';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import type { TileSize } from '@/hooks/use-tile-size';

type Props = {
  label: string; // "Nuova categoria", "Aggiungi persona"
  size: TileSize; // same width as the other tiles; the row stretches it to their height
  onPress: () => void;
  radius?: number; // the radius of the tiles next to it (20; 12 for card-shaped tiles)
  color?: string; // border, "+" and label: a section color; #C9CCDA border and grey text by default
};

// Dashed tile at the end of a grid, to add a new item: same size as the items it adds,
// 2 px dashed border, "+" and a 15/500 label
export function DashedAddTile({ label, size, onPress, radius = Radius.tile, color }: Props) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const iconRow = useIconRow(); // large text: full width, "+" and the label on one line

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        size,
        styles.tile,
        iconRow.addRow,
        { borderColor: color ?? theme.dashed, borderRadius: radius },
        pressed && { backgroundColor: theme.paleLilac },
      ]}>
      <SymbolView name="plus" tintColor={color ?? theme.textSecondary} size={24} />
      <NoBreakText style={[styles.label, iconRow.addLabel, { color: color ?? theme.textSecondary }]} containerStyle={styles.labelBox}>
        {label}
      </NoBreakText>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  tile: {
    borderCurve: 'continuous',
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
  },
  labelBox: {
    flexShrink: 1,
    alignSelf: 'stretch',
  },
  label: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    textAlign: 'center',
  },
});
