import { SymbolView, type SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useRenderWarning } from '@/dev/render-warning';
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
const PADDING = 10; // left and right inside a segment
const SYMBOL = 14;
const SYMBOL_GAP = 5;
// Up to 200 % (Apple's Larger Text): beyond it a segment can't hold a word on the narrow phones
export const SEGMENT_MAX_FONT_SCALE = 2;

// Choice between a few options (PDF/Foto, Foto/Colore, Tema…): 38-high segments inside a lilac
// pill, the chosen one a white pill with a shadow and indigo text. Every label is measured at its
// natural one-line width: if any of them doesn't fit its segment (narrow phone, large text, a long
// language) the options become a vertical list of pills, one per row, a check on the active one.
// Labels are never broken inside a word and never shrunk.
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
  const [width, setWidth] = useState(0); // the whole control
  const [labelWidths, setLabelWidths] = useState<number[]>([]);
  useRenderWarning('Segmented', values.join(' / '));

  const segmentRoom = width > 0 ? (width - INSET * 2) / values.length - PADDING * 2 : 0;
  const measured = width > 0 && labelWidths.length === values.length && labelWidths.every((w) => w > 0);
  const vertical =
    measured &&
    values.some((_, index) => labelWidths[index] + (symbols?.[index] ? SYMBOL + SYMBOL_GAP : 0) > segmentRoom);
  const activeText = activeColor ?? theme.segmentedActiveText;

  const measure = (index: number, w: number) =>
    setLabelWidths((prev) => {
      if (prev[index] === Math.ceil(w)) return prev; // nothing changed: no new render
      const next = [...prev];
      next[index] = Math.ceil(w);
      return next;
    });

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* Invisible copies of the labels at their natural width (one line, chosen weight) */}
      <View style={styles.measure} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {values.map((value, index) => (
          <Text
            key={`m-${index}-${value}`}
            style={[styles.label, styles.labelSelected]}
            maxFontSizeMultiplier={SEGMENT_MAX_FONT_SCALE}
            onLayout={(e) => measure(index, e.nativeEvent.layout.width)}>
            {value}
          </Text>
        ))}
      </View>

      <View
        style={[
          vertical ? styles.list : styles.pill,
          tint !== undefined && { backgroundColor: tint },
          !enabled && styles.disabled,
        ]}
        accessibilityRole="tablist"
        accessibilityLabel={accessibilityLabel}>
        {values.map((value, index) => {
          const selected = index === selectedIndex;
          const ink = selected ? activeText : theme.textSecondary;
          return (
            <Pressable
              key={`${index}-${value}`}
              onPress={() => !selected && onChange(index)}
              disabled={!enabled}
              accessibilityRole="tab"
              accessibilityLabel={value}
              accessibilityState={{ selected, disabled: !enabled }}
              style={[vertical ? styles.row : styles.segment, selected && styles.selected]}>
              {symbols?.[index] && <SymbolView name={symbols[index]!} tintColor={ink} size={SYMBOL} weight="semibold" />}
              <Text
                style={[
                  styles.label,
                  vertical && styles.labelRow,
                  selected ? [styles.labelSelected, activeColor !== undefined && { color: activeColor }] : styles.labelIdle,
                ]}
                numberOfLines={vertical ? undefined : 1}
                maxFontSizeMultiplier={SEGMENT_MAX_FONT_SCALE}>
                {value}
              </Text>
              {vertical && selected && <SymbolView name="checkmark" tintColor={ink} size={15} weight="semibold" />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  measure: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 4000,
    flexDirection: 'row',
    alignItems: 'flex-start',
    opacity: 0,
  },
  pill: {
    flexDirection: 'row',
    padding: INSET,
    borderRadius: Radius.pill,
    backgroundColor: c.lilac,
  },
  list: {
    padding: INSET,
    gap: INSET,
    borderRadius: 22,
    borderCurve: 'continuous',
    backgroundColor: c.lilac,
  },
  disabled: {
    opacity: 0.5,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: SYMBOL_GAP,
    minHeight: SEGMENT_HEIGHT,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: PADDING,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    borderRadius: 18,
    borderCurve: 'continuous',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  selected: {
    backgroundColor: c.segmentedActive,
    boxShadow: '0 2px 8px rgba(28, 30, 70, 0.12)',
  },
  label: {
    fontSize: 15,
    textAlign: 'center',
  },
  labelRow: {
    flex: 1,
    textAlign: 'left',
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
