import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet } from 'react-native';

import { type Palette } from '@/constants/theme';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Props = {
  symbol: SFSymbol;
  accessibilityLabel: string;
  onPress: () => void;
  background?: string; // lilac by default, or the tint of the section
  color?: string; // indigo by default, or the text on that tint
  expanded?: boolean; // a toggle that opens something below (search): told to VoiceOver
};

// Round 44 × 44 button at the top of a page: back, search, "…", share, menu
export function RoundIconButton({
  symbol,
  accessibilityLabel,
  onPress,
  background,
  color,
  expanded,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { pressed, handlers } = usePressed();
  const fill = background ?? theme.lilac; // lilac by default, or the tint of the section
  const ink = color ?? theme.indigo;
  return (
    <Pressable
      {...handlers}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={expanded === undefined ? undefined : { expanded }}
      style={[styles.button, { backgroundColor: fill }, pressed && styles.pressed]}>
      <SymbolView name={symbol} tintColor={ink} size={20} weight="semibold" />
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
