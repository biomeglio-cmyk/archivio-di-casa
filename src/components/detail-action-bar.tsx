import { LinearGradient } from 'expo-linear-gradient';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BRAND_COLOR, BRAND_GRADIENT, DANGER_COLOR, FONTS } from '@/constants/brand';
import { usePressed } from '@/hooks/use-pressed';

type Props = {
  onAdd: () => void;
  onEdit: (() => void) | null; // null = the button is not shown
  onDelete: (() => void) | null;
};

// Bottom row of the detail screens: "Aggiungi documento" (logo gradient), "Modifica", "Cancella" (red).
// Put it as the last child of a ScrollView whose content grows (flexGrow: 1) after a flexible
// spacer: short pages get it at the bottom, long pages after the data, always above the tab bar.
export function DetailActionBar({ onAdd, onEdit, onDelete }: Props) {
  return (
    <View style={styles.bar}>
      <ActionButton label="Aggiungi documento" symbol="plus" variant="gradient" onPress={onAdd} />
      {onEdit && <ActionButton label="Modifica" symbol="pencil" variant="secondary" onPress={onEdit} />}
      {onDelete && <ActionButton label="Cancella" symbol="trash" variant="danger" onPress={onDelete} />}
    </View>
  );
}

type ActionButtonProps = {
  label: string;
  symbol: SFSymbol;
  variant: 'gradient' | 'secondary' | 'danger';
  onPress: () => void;
};

// Compact button: icon above a short label, so three fit side by side
function ActionButton({ label, symbol, variant, onPress }: ActionButtonProps) {
  const { pressed, handlers } = usePressed();
  const color = variant === 'gradient' ? '#FFFFFF' : variant === 'danger' ? DANGER_COLOR : BRAND_COLOR;
  const content = (
    <>
      <SymbolView name={symbol} tintColor={color} size={20} />
      <Text style={[styles.label, { color }]} numberOfLines={2}>
        {label}
      </Text>
    </>
  );

  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.button, variant !== 'gradient' && styles[variant], pressed && styles.pressed]}>
      {variant === 'gradient' ? (
        <LinearGradient colors={BRAND_GRADIENT} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 8,
  },
  button: {
    flex: 1, // three equal columns
    height: 68,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  fill: {
    alignSelf: 'stretch',
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  secondary: {
    backgroundColor: `${BRAND_COLOR}1F`,
  },
  danger: {
    backgroundColor: `${DANGER_COLOR}1A`,
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: FONTS.titleSemiBold,
  },
});
