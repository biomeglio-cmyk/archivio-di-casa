import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type AccessibilityRole, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';
import { useTileColumns } from '@/hooks/use-tile-size';

type Props = {
  children: string;
  style: StyleProp<TextStyle>; // must include fontSize (and lineHeight, if any)
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
  containerStyle?: StyleProp<ViewStyle>; // position in the tile (e.g. pushed to the bottom)
  accessibilityRole?: AccessibilityRole; // "header" for page titles
};

const MIN_SCALE = 0.85; // shrink only a little, as a last resort
const TITLE_MAX_FONT_SCALE = 1.25;
const LAST_RESORT = 0.5; // a word that doesn't fit even in one column (never cut)
const SAFETY = 1; // a point of room, so rounding never pushes the word onto two lines

type Box = { width: number; wordWidth: number; needed: number };

// How much the text must shrink so its widest word fits its box. Decided only when the word really
// overflows the box at the current size: a box as wide as its own text (a button label) never
// overflows, so it never starts shrinking itself (that loop made "Salva" tiny). It grows back when
// the box gets wider.
function decide(box: Box): Box {
  const { width, wordWidth, needed } = box;
  if (width <= 0 || wordWidth <= 0) return box;
  const current = Math.max(LAST_RESORT, needed);
  const fits = (width - SAFETY) / wordWidth;
  if (width + SAFETY < wordWidth * current) return { ...box, needed: fits }; // the word overflows
  if (needed < 1 && fits > needed + 0.01) return { ...box, needed: Math.min(1, fits) }; // more room
  return box;
}

// The name on a tile (category, document, card). It wraps only between words, never inside one:
// when its longest word is wider than the tile, the font shrinks for this tile until the word
// fits (down to 85 %, a last resort). In a grid tile it then ends with "…" (the grid's columns depend
// only on the text size); outside a grid the text gets smaller still: a word is never broken. The words are measured by an invisible copy with one word per line.
// Text grows up to 200 % (Apple's Larger Text) unless the caller sets another cap.
export function TileTitle({
  children,
  style,
  numberOfLines = 2,
  maxFontSizeMultiplier,
  containerStyle,
  accessibilityRole,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const { fontScale } = useWindowDimensions();
  const { inGrid } = useTileColumns();

  // Larger text: twice the lines, so a name is not cut after a word or two
  const lines = numberOfLines > 0 && fontScale > 1.3 ? numberOfLines * 2 : numberOfLines;
  // width: the box of the text; wordWidth: its widest word at full size; needed: the scale it needs
  const [box, setBox] = useState<Box>({ width: 0, wordWidth: 0, needed: 1 });
  const update = (patch: Partial<Box>) => setBox((prev) => decide({ ...prev, ...patch }));

  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? 17;
  // Up to 200 %; the big page titles (28–30 pt) up to 125 %, already large (~37 pt)
  const cap = maxFontSizeMultiplier ?? (fontSize >= 28 ? TITLE_MAX_FONT_SCALE : 2);
  const words = children.trim().split(/\s+/).join('\n'); // one word per line, to measure them all

  const { needed } = box;
  const tooLong = needed < MIN_SCALE; // the word does not fit even at 85 %
  // In a tile of a grid: 85 % at most, then the name ends with "…" (one line, so a word is never
  // broken across two). Outside a grid (page titles, buttons) a word is never cut: the text gets as
  // small as needed (check:fit flags those cases).
  const truncates = tooLong && inGrid;
  const scale = tooLong && !inGrid ? Math.max(LAST_RESORT, needed) : Math.max(MIN_SCALE, needed);
  const sized: TextStyle =
    scale < 1
      ? { fontSize: fontSize * scale, ...(flat.lineHeight !== undefined && { lineHeight: flat.lineHeight * scale }) }
      : {};

  return (
    <View style={containerStyle} onLayout={(event) => update({ width: event.nativeEvent.layout.width })}>
      <Text
        style={[style, sized]}
        numberOfLines={truncates ? 1 : lines}
        accessibilityRole={accessibilityRole}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={cap}>
        {children}
      </Text>
      {/* Measuring copy: never shown, never read by VoiceOver */}
      <Text
        style={[style, styles.measure]}
        maxFontSizeMultiplier={cap}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onTextLayout={(event) => update({ wordWidth: Math.max(0, ...event.nativeEvent.lines.map((line) => line.width)) })}>
        {words}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  measure: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 2000, // wide enough to keep every word on its own line
    opacity: 0,
  },
});

// The same rule for any text that has little room (page titles, buttons): it wraps only between
// words, any number of lines; a word too wide for the line makes the font smaller (down to 70%)
// instead of breaking in the middle. Used by the check in scripts/check-text-fit.js.
export function NoBreakText(props: Omit<Props, 'numberOfLines'>) {
  return <TileTitle {...props} numberOfLines={0} />;
}
