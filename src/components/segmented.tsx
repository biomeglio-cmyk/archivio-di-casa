import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Text } from '@/components/text';
import { type Palette, Radius } from '@/constants/theme';
import { FONTS } from '@/constants/typography';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Props = {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  enabled?: boolean;
  tint?: string; // the pill: lilac by default, or a section tint
  activeColor?: string; // text of the chosen segment: indigo by default
  symbols?: (SFSymbol | undefined)[]; // an icon before a label (Tema: ☀ Chiaro, ☾ Scuro)
  accessibilityLabel?: string; // VoiceOver name of the group ("Copertina", "Vista")
};

const SEGMENT_HEIGHT = 38;
const INSET = 4;

// Choice between a few options (PDF/Foto, Foto/Colore…): 38-high segments inside a lilac pill,
// the chosen one a white pill with a shadow and indigo text
export function Segmented({
  values,
  selectedIndex,
  onChange,
  enabled = true,
  tint,
  activeColor,
  symbols,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { fontScale } = useWindowDimensions();
  const large = fontScale > 1.3; // larger text: labels wrap at full size instead of shrinking
  return (
    <View
      style={[styles.pill, tint !== undefined && { backgroundColor: tint }, !enabled && styles.disabled]}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}>
      {values.map((value, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={`${index}-${value}`}
            onPress={() => !selected && onChange(index)}
            disabled={!enabled}
            accessibilityRole="tab"
            accessibilityLabel={value}
            accessibilityState={{ selected, disabled: !enabled }}
            style={[styles.segment, selected && styles.selected]}>
            {symbols?.[index] && (
              <SymbolView
                name={symbols[index]!}
                tintColor={selected ? (activeColor ?? theme.segmentedActiveText) : theme.textSecondary}
                size={14}
                weight="semibold"
              />
            )}
            <Text
              style={[
                styles.label,
                selected
                  ? [styles.labelSelected, activeColor !== undefined && { color: activeColor }]
                  : styles.labelIdle,
              ]}
              numberOfLines={large ? undefined : 1}
              adjustsFontSizeToFit={!large}
              minimumFontScale={0.75}>
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  pill: {
    flexDirection: 'row',
    padding: INSET,
    borderRadius: Radius.pill,
    backgroundColor: c.lilac,
  },
  disabled: {
    opacity: 0.5,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 5,
    minHeight: SEGMENT_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  selected: {
    backgroundColor: c.segmentedActive,
    boxShadow: '0 2px 8px rgba(28, 30, 70, 0.12)',
  },
  label: {
    flexShrink: 1,
    fontSize: 15,
    textAlign: 'center',
  },
  labelSelected: {
    color: c.segmentedActiveText,
    fontFamily: FONTS.semiBold,
  },
  labelIdle: {
    color: c.textSecondary,
    fontFamily: FONTS.medium,
  },
});
