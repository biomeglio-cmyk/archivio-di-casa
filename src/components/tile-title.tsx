import { useEffect, useState } from 'react';
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

// The name on a tile (category, document, card). It wraps only between words, never inside one:
// when its longest word is wider than the tile, the font shrinks for this tile until the word
// fits (down to 85 %, a last resort); if it still does not fit, the tile grid is told and lays out
// with one column (TileColumnsProvider), so the word gets the room; if even that is not enough the
// text gets smaller still: a word is never cut or broken (npm run check:fit reports these cases). The words are measured by an invisible copy with one word per line.
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
  const { reportTooLong, inGrid, columns } = useTileColumns();

  // Larger text: twice the lines, so a name is not cut after a word or two
  const lines = numberOfLines > 0 && fontScale > 1.3 ? numberOfLines * 2 : numberOfLines;
  const [width, setWidth] = useState(0); // room for the text
  const [wordWidth, setWordWidth] = useState(0); // the widest word at the full font size

  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? 17;
  // Up to 200 %; the big page titles (28–30 pt) up to 125 %, already large (~37 pt)
  const cap = maxFontSizeMultiplier ?? (fontSize >= 28 ? TITLE_MAX_FONT_SCALE : 2);
  const words = children.trim().split(/\s+/).join('\n'); // one word per line, to measure them all

  const needed = width > 0 && wordWidth > width - SAFETY ? (width - SAFETY) / wordWidth : 1;
  const tooLong = needed < MIN_SCALE; // the word does not fit even at 85 %
  // In a 2-column grid: 85 % while the grid moves to one column. Otherwise (one column, a title, a
  // button) the word must still never be cut: the text gets as small as needed (check:fit flags it)
  const waitsForColumn = tooLong && inGrid && columns === 2;
  const scale = tooLong && !waitsForColumn ? Math.max(LAST_RESORT, needed) : Math.max(MIN_SCALE, needed);
  useEffect(() => {
    if (tooLong) reportTooLong(); // the grid goes to one column
  }, [tooLong, reportTooLong]);
  const sized: TextStyle =
    scale < 1
      ? { fontSize: fontSize * scale, ...(flat.lineHeight !== undefined && { lineHeight: flat.lineHeight * scale }) }
      : {};

  return (
    <View style={containerStyle} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Text
        style={[style, sized]}
        numberOfLines={lines}
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
        onTextLayout={(event) => setWordWidth(Math.max(0, ...event.nativeEvent.lines.map((line) => line.width)))}>
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
