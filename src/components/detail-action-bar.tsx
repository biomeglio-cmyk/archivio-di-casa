import { Fragment } from 'react';
import { StyleSheet, View } from 'react-native';

import { SheetOption } from '@/components/sheet-option';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  onAdd: () => void;
  onEdit: (() => void) | null; // null = the row is not shown
  onDelete: (() => void) | null;
};

// Actions at the end of the detail screens, like the rows of the "+" sheet:
// one rounded group with full-width rows "Aggiungi documento", "Modifica", "Cancella" (red).
// It sits in the scroll content, right after the data, and scrolls with the page.
export function DetailActionBar({ onAdd, onEdit, onDelete }: Props) {
  const theme = useTheme();
  const rows = [
    { key: 'add', label: 'Aggiungi documento', symbol: 'plus.circle' as const, onPress: onAdd, destructive: false },
    onEdit && { key: 'edit', label: 'Modifica', symbol: 'pencil' as const, onPress: onEdit, destructive: false },
    onDelete && { key: 'delete', label: 'Cancella', symbol: 'trash' as const, onPress: onDelete, destructive: true },
  ].filter((row) => Boolean(row)) as {
    key: string;
    label: string;
    symbol: 'plus.circle' | 'pencil' | 'trash';
    onPress: () => void;
    destructive: boolean;
  }[];

  return (
    <View style={[styles.group, { backgroundColor: theme.backgroundElement }]}>
      {rows.map((row, index) => (
        <Fragment key={row.key}>
          {/* Hairline between rows, indented like iOS lists (after the icon) */}
          {index > 0 && <View style={[styles.separator, { backgroundColor: theme.backgroundSelected }]} />}
          <SheetOption grouped symbol={row.symbol} label={row.label} onPress={row.onPress} destructive={row.destructive} />
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden', // the pressed highlight of the rows follows the rounded corners
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56, // 16 padding + 28 icon + 12 gap
  },
});
