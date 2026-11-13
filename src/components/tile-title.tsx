import { useState } from 'react';
import { StyleSheet, View, type AccessibilityRole, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

import { Text } from '@/components/text';
import { type Palette } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/use-theme';

type Props = {
  children: string;
  style: StyleProp<TextStyle>; // must include fontSize (and lineHeight, if any)
  numberOfLines?: number;
  maxFontSizeMultiplier?: number;
  containerStyle?: StyleProp<ViewStyle>; // position in the tile (e.g. pushed to the bottom)
  accessibilityRole?: AccessibilityRole; // "header" for page titles
};

const MIN_SCALE = 0.7;
const SAFETY = 1; // a point of room, so rounding never pushes the word onto two lines

// The name on a tile (category, document, card). It wraps only between words, never inside one:
// when its longest word is wider than the tile, the font shrinks for this tile until the word
// fits (down to 70%); if it still does not fit, the name stays on one line and ends with "…".
// The words are measured by an invisible copy with one word per line.
export function TileTitle({
  children,
  style,
  numberOfLines = 2,
  maxFontSizeMultiplier,
  containerStyle,
  accessibilityRole,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  const [width, setWidth] = useState(0); // room for the text
  const [wordWidth, setWordWidth] = useState(0); // the widest word at the full font size

  const flat = StyleSheet.flatten(style) ?? {};
  const fontSize = flat.fontSize ?? 17;
  const words = children.trim().split(/\s+/).join('\n'); // one word per line, to measure them all

  const needed = width > 0 && wordWidth > width - SAFETY ? (width - SAFETY) / wordWidth : 1;
  const scale = Math.max(MIN_SCALE, needed);
  const tooLong = needed < MIN_SCALE; // the word does not fit even at 70%: one line with "…"
  const sized: TextStyle =
    scale < 1
      ? { fontSize: fontSize * scale, ...(flat.lineHeight !== undefined && { lineHeight: flat.lineHeight * scale }) }
      : {};

  return (
    <View style={containerStyle} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Text
        style={[style, sized]}
        numberOfLines={tooLong ? 1 : numberOfLines}
        accessibilityRole={accessibilityRole}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={maxFontSizeMultiplier}>
        {children}
      </Text>
      {/* Measuring copy: never shown, never read by VoiceOver */}
      <Text
        style={[style, styles.measure]}
        maxFontSizeMultiplier={maxFontSizeMultiplier}
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
