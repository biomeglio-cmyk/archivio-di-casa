import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_GRADIENT, FONTS, PIN_COLOR } from '@/constants/brand';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';

const RADIUS = 12;
const MIN_HEIGHT = 48;
const DELETE_BACKGROUND = '#FDE3E6';
const DELETE_TEXT = '#C8283D';
const PIN_TINT = `${PIN_COLOR}33`; // the star color at 20%: "Tenuta sottomano" stands out
const MAX_FONT_SCALE = 1.2; // labels grow a little with Dynamic Type, then stop so the row always fits

type Props = {
  onAdd: (() => void) | null; // null = the button is not shown
  onEdit: (() => void) | null;
  onDelete: (() => void) | null; // the caller shows the confirmation alert
  pin?: { pinned: boolean; onToggle: () => void }; // "Tieni sottomano" / "Tenuta sottomano"
};

// Buttons at the end of the detail screens (layout B of the mockup):
// "Aggiungi documento" full width with the logo gradient, "Tieni sottomano" full width, then
// "Modifica" and "Cancella" always side by side, at any text size.
// They sit in the scroll content, right after the data, and scroll with the page.
export function DetailActionBar({ onAdd, onEdit, onDelete, pin }: Props) {
  const theme = useTheme();

  if (!onAdd && !onEdit && !onDelete && !pin) return null;

  return (
    <View style={styles.container}>
      {onAdd && <ActionButton label="Aggiungi documento" symbol="plus" variant="primary" onPress={onAdd} />}
      {pin && (
        <ActionButton
          label={pin.pinned ? 'Tenuta sottomano' : 'Tieni sottomano'}
          symbol={pin.pinned ? 'star.fill' : 'star'}
          symbolColor={PIN_COLOR}
          variant="wide"
          onPress={pin.onToggle}
          style={{ backgroundColor: pin.pinned ? PIN_TINT : theme.backgroundSelected }}
          color={theme.text}
          selected={pin.pinned}
        />
      )}
      {(onEdit || onDelete) && (
        <View style={styles.row}>
          {onEdit && (
            <ActionButton
              label="Modifica"
              symbol="pencil"
              variant="secondary"
              onPress={onEdit}
              style={{ backgroundColor: theme.backgroundSelected }}
              color={theme.text}
            />
          )}
          {onDelete && (
            <ActionButton
              label="Cancella"
              symbol="trash"
              variant="secondary"
              onPress={onDelete}
              style={{ backgroundColor: DELETE_BACKGROUND }}
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
  variant: 'primary' | 'secondary' | 'wide'; // wide = full width, like primary, without gradient
  onPress: () => void;
  style?: object;
  color?: string;
  symbolColor?: string; // defaults to the text color
  selected?: boolean; // toggle buttons
};

function ActionButton({ label, symbol, variant, onPress, style, color = '#FFFFFF', symbolColor, selected }: ActionButtonProps) {
  const { pressed, handlers } = usePressed();
  const content = (
    <>
      <SymbolView name={symbol} tintColor={symbolColor ?? color} size={17} />
      {/* One line, capped at 1.2× Dynamic Type; if still too wide it shrinks (down to 80%)
          instead of being cut with "…" */}
      <Text
        style={[styles.label, { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        maxFontSizeMultiplier={MAX_FONT_SCALE}>
        {label}
      </Text>
    </>
  );

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
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
    flexDirection: 'row', // Modifica and Cancella always side by side
    gap: 8,
  },
  button: {
    minHeight: MIN_HEIGHT,
    borderRadius: RADIUS,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  secondary: {
    flex: 1, // two equal halves of the row
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
    fontSize: 17, // 17 pt semibold
    textAlign: 'center',
    fontFamily: FONTS.titleSemiBold,
  },
});
