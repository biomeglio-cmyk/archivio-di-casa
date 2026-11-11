import { createContext, use, type Ref } from 'react';
import {
  Text as NativeText,
  StyleSheet,
  TextInput as NativeTextInput,
  type TextInputInstance,
  type TextInputProps,
  type TextProps,
} from 'react-native';

import { withOnest } from '@/constants/typography';

// True inside a Text: a nested Text inherits font and spacing from its parent unless it sets its own
const InsideText = createContext(false);

// The app Text: Onest in the weight of fontWeight, with the guide letter spacing.
// Use it instead of the Text of react-native everywhere.
export function Text({ style, children, ...rest }: TextProps) {
  const nested = use(InsideText);
  const flat = StyleSheet.flatten(style) ?? {};
  const inherits = nested && flat.fontWeight === undefined && flat.fontFamily === undefined && flat.fontSize === undefined;
  return (
    <NativeText {...rest} style={inherits ? flat : withOnest(flat, nested ? undefined : 17)}>
      {nested ? children : <InsideText value>{children}</InsideText>}
    </NativeText>
  );
}

// The app TextInput, with the same font
export function TextInput({ style, ref, ...rest }: TextInputProps & { ref?: Ref<TextInputInstance> }) {
  return <NativeTextInput {...rest} ref={ref} style={withOnest(StyleSheet.flatten(style) ?? {})} />;
}
