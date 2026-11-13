import { createContext, use, useState, type ReactNode, type Ref } from 'react';
import {
  Text as NativeText,
  StyleSheet,
  TextInput as NativeTextInput,
  useWindowDimensions,
  type TextInputInstance,
  type TextInputProps,
  type TextLayoutEvent,
  type TextProps,
} from 'react-native';

import { useRenderWarning } from '@/dev/render-warning';
import { useAccessibilitySettings } from '@/a11y/accessibility';
import { withOnest } from '@/constants/typography';
import { LARGE_TEXT_SCALE } from '@/hooks/use-large-text';

// True inside a Text: a nested Text inherits font and spacing from its parent unless it sets its own
const InsideText = createContext(false);

// Dynamic Type up to 200 % (Apple's "Larger Text" criterion). A caller can pass its own cap.
export const MAX_FONT_SCALE = 2;

// A word is never broken in the middle. iOS breaks a word that is wider than its line (a long
// German or Finnish word on a narrow phone at a large text size): when that happens this Text gets
// a little smaller, step by step, until every word sits whole on a line. Only texts that could be
// at risk are watched (a long word at a large size), so the others cost nothing.
const STEP = 0.92;
const MIN_FIT = 0.5;
const WIDEST_CHAR_EM = 0.62; // generous width of an Onest letter, for the risk estimate
const PAGE_SIDES = 44;

function plainText(children: ReactNode): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children) && children.every((c) => typeof c === 'string' || typeof c === 'number')) return children.join('');
  return null;
}

// A line that ends inside a word: letter or digit on both sides of the break (after a space,
// a hyphen or a slash the break is between words)
function breaksInsideWord(lines: { text: string }[]): boolean {
  for (let i = 0; i < lines.length - 1; i++) {
    const end = lines[i].text.slice(-1);
    const next = lines[i + 1].text.charAt(0);
    if (/[\p{L}\p{N}]/u.test(end) && /[\p{L}\p{N}]/u.test(next)) return true;
  }
  return false;
}

// The app Text: Onest in the weight of fontWeight, with the guide letter spacing, never a word
// broken in the middle. Use it instead of the Text of react-native everywhere.
export function Text({ style, children, maxFontSizeMultiplier = MAX_FONT_SCALE, onTextLayout, ...rest }: TextProps) {
  const nested = use(InsideText);
  const { boldText } = useAccessibilitySettings();
  const { width: screenWidth, fontScale } = useWindowDimensions();
  const flat = StyleSheet.flatten(style) ?? {};
  const inherits =
    nested && flat.fontWeight === undefined && flat.fontFamily === undefined && flat.fontSize === undefined;

  // At risk: its longest word, at this text size, could be wider than the page
  const plain = nested ? null : plainText(children);
  const fontSize = flat.fontSize ?? 17;
  const size = fontSize * Math.min(fontScale, maxFontSizeMultiplier ?? MAX_FONT_SCALE);
  const longest = plain ? Math.max(0, ...plain.split(/\s+/).map((w) => w.length)) : 0;
  // (a long word for the page, or any text with large text: in a narrow column even "promemoria"
  // can be too wide)
  useRenderWarning('Text', plain);
  const atRisk =
    plain !== null &&
    rest.numberOfLines !== 1 &&
    (fontScale >= LARGE_TEXT_SCALE || longest * size * WIDEST_CHAR_EM > screenWidth - PAGE_SIDES);

  // The fit scale belongs to this text at this size and width; a new one starts from 100 %
  const fitKey = `${plain}|${fontScale}|${screenWidth}`;
  const [fit, setFit] = useState({ key: fitKey, scale: 1 });
  const scale = fit.key === fitKey ? fit.scale : 1;

  const watch = (event: TextLayoutEvent) => {
    onTextLayout?.(event);
    if (scale > MIN_FIT && breaksInsideWord(event.nativeEvent.lines)) {
      setFit({ key: fitKey, scale: Math.max(MIN_FIT, scale * STEP) });
    }
  };

  const base = inherits ? flat : withOnest(flat, nested ? undefined : 17, boldText);
  const fitted =
    scale < 1
      ? { ...base, fontSize: fontSize * scale, ...(flat.lineHeight !== undefined && { lineHeight: flat.lineHeight * scale }) }
      : base;

  return (
    <NativeText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      onTextLayout={atRisk ? watch : onTextLayout}
      style={fitted}>
      {nested ? children : <InsideText value>{children}</InsideText>}
    </NativeText>
  );
}

// The app TextInput, with the same font
export function TextInput({
  style,
  ref,
  maxFontSizeMultiplier = MAX_FONT_SCALE,
  ...rest
}: TextInputProps & { ref?: Ref<TextInputInstance> }) {
  const { boldText } = useAccessibilitySettings();
  return (
    <NativeTextInput
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      ref={ref}
      style={withOnest(StyleSheet.flatten(style) ?? {}, 17, boldText)}
    />
  );
}
