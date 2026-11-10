import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BRAND_GRADIENT, FONTS } from '@/constants/brand';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';

const RADIUS = 12;
const MIN_HEIGHT = 48;
const DELETE_BACKGROUND = '#FDE3E6';
const DELETE_TEXT = '#C8283D';
const SECONDARY_BASIS = 130; // starting width of Modifica / Cancella at normal text size

type Props = {
  onAdd: (() => void) | null; // null = the button is not shown
  onEdit: (() => void) | null;
  onDelete: (() => void) | null; // the caller shows the confirmation alert
};

// Buttons at the end of the detail screens (layout B of the mockup):
// "Aggiungi documento" full width with the logo gradient, then "Modifica" and "Cancella" side by side.
// They sit in the scroll content, right after the data, and scroll with the page.
export function DetailActionBar({ onAdd, onEdit, onDelete }: Props) {
  const theme = useTheme();
  // Both secondary buttons start from the same width, scaled with Dynamic Type; when two don't fit
  // in the row, flexWrap puts the second below and each grows to full width: stacked, never cut.
  const { fontScale } = useWindowDimensions();
  const basis = SECONDARY_BASIS * fontScale;

  if (!onAdd && !onEdit && !onDelete) return null;

  return (
    <View style={styles.container}>
      {onAdd && <ActionButton label="Aggiungi documento" symbol="plus" variant="primary" onPress={onAdd} />}
      {(onEdit || onDelete) && (
        <View style={styles.row}>
          {onEdit && (
            <ActionButton
              label="Modifica"
              symbol="pencil"
              variant="secondary"
              onPress={onEdit}
              style={{ flexBasis: basis, backgroundColor: theme.backgroundSelected }}
              color={theme.text}
            />
          )}
          {onDelete && (
            <ActionButton
              label="Cancella"
              symbol="trash"
              variant="secondary"
              onPress={onDelete}
              style={{ flexBasis: basis, backgroundColor: DELETE_BACKGROUND }}
              color={DELETE_TEXT}
            />
          )}
        </View>
      )}
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  symbol: SFSymbol;
  variant: 'primary' | 'secondary';
  onPress: () => void;
  style?: object;
  color?: string;
};

function ActionButton({ label, symbol, variant, onPress, style, color = '#FFFFFF' }: ActionButtonProps) {
  const { pressed, handlers } = usePressed();
  const content = (
    <>
      <SymbolView name={symbol} tintColor={color} size={17} />
      {/* No numberOfLines: with very large text the label wraps instead of ending in "…" */}
      <Text style={[styles.label, { color }]}>{label}</Text>
    </>
  );

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.button, variant === 'secondary' && styles.secondary, style, pressed && styles.pressed]}>
      {variant === 'primary' ? (
        <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.inner}>
          {content}
        </LinearGradient>
      ) : (
        <View style={styles.inner}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap', // stacks the two buttons when they don't fit side by side
    gap: 8,
  },
  button: {
    minHeight: MIN_HEIGHT,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  secondary: {
    flexGrow: 1, // same basis + same grow = equal widths when they share the row
    flexShrink: 0,
  },
  inner: {
    flexGrow: 1,
    minHeight: MIN_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    flexShrink: 1,
    fontSize: 17,
    textAlign: 'center',
    fontFamily: FONTS.titleSemiBold,
  },
});
