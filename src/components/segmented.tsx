import { SymbolView, type SFSymbol } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/text';
import { Colors, Radius, themedStyles } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type Props = {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  enabled?: boolean;
  tint?: string; // the pill: lilac by default, or a section tint
  activeColor?: string; // text of the chosen segment: indigo by default
  symbols?: (SFSymbol | undefined)[]; // an icon before a label (Tema: ☀ Chiaro, ☾ Scuro)
};

const SEGMENT_HEIGHT = 38;
const INSET = 4;

// Choice between a few options (PDF/Foto, Foto/Colore…): 38-high segments inside a lilac pill,
// the chosen one a white pill with a shadow and indigo text
export function Segmented({ values, selectedIndex, onChange, enabled = true, tint, activeColor, symbols }: Props) {
  return (
    <View
      style={[styles.pill, tint !== undefined && { backgroundColor: tint }, !enabled && styles.disabled]}
      accessibilityRole="tablist">
      {values.map((value, index) => {
        const selected = index === selectedIndex;
        return (
          <Pressable
            key={`${index}-${value}`}
            onPress={() => !selected && onChange(index)}
            disabled={!enabled}
            accessibilityRole="tab"
            accessibilityState={{ selected, disabled: !enabled }}
            style={[styles.segment, selected && styles.selected]}>
            {symbols?.[index] && (
              <SymbolView
                name={symbols[index]!}
                tintColor={selected ? (activeColor ?? Colors.current.segmentedActiveText) : Colors.current.textSecondary}
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
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              maxFontSizeMultiplier={1.4}>
              {value}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = themedStyles(() =>
  StyleSheet.create({
  pill: {
    flexDirection: 'row',
    padding: INSET,
    borderRadius: Radius.pill,
    backgroundColor: Colors.current.lilac,
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
  },
  selected: {
    backgroundColor: Colors.current.segmentedActive,
    boxShadow: '0 2px 8px rgba(28, 30, 70, 0.12)',
  },
  label: {
    fontSize: 15,
  },
  labelSelected: {
    color: Colors.current.segmentedActiveText,
    fontFamily: FONTS.semiBold,
  },
  labelIdle: {
    color: Colors.current.textSecondary,
    fontFamily: FONTS.medium,
  },
}));
