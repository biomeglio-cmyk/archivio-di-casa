import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View, type TextInputInstance } from 'react-native';

import { Text, TextInput } from '@/components/text';
import { BRAND_COLOR } from '@/constants/brand';
import { type Palette, Radius } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  onOpen?: () => void; // Home: the field is a button that opens the Ricerca screen
};

const HEIGHT = 64;
const LENS_COLOR = '#6D5CE6'; // the magnifying glass of the design

// Home search field (docs/design/Main.dc.html): 64-high lilac pill, text 16, lens on the right.
// While typing: a clear button, and "Annulla" next to it, which empties the field and closes
// the keyboard.
export function SearchBar({ value, onChangeText, placeholder, onOpen }: Props) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const inputRef = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(false);
  const active = focused || value.length > 0;

  function cancel() {
    onChangeText('');
    inputRef.current?.blur();
    Keyboard.dismiss();
    setFocused(false);
  }

  if (onOpen) {
    return (
      <Pressable
        onPress={onOpen}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={({ pressed }) => [styles.field, { backgroundColor: theme.lilac }, pressed && styles.pressed]}>
        <Text style={[styles.input, { color: theme.textSecondary }]} numberOfLines={1}>
          {placeholder}
        </Text>
        <SymbolView name="magnifyingglass" tintColor={LENS_COLOR} size={19} weight="semibold" />
      </Pressable>
    );
  }

  return (
    <View style={styles.row}>
      <Pressable onPress={() => inputRef.current?.focus()} style={[styles.field, { backgroundColor: theme.lilac }]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          accessibilityLabel={placeholder}
          style={[styles.input, { color: theme.text }]}
        />
        {value.length > 0 && (
          <Pressable
            onPress={() => onChangeText('')}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Cancella testo">
            <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={18} />
          </Pressable>
        )}
        <SymbolView name="magnifyingglass" tintColor={LENS_COLOR} size={19} weight="semibold" />
      </Pressable>
      {active && (
        <Pressable onPress={cancel} hitSlop={8} accessibilityRole="button" style={styles.cancelButton}>
          <Text style={styles.cancel}>Annulla</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: HEIGHT,
    paddingHorizontal: 22,
    borderRadius: Radius.pill,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  pressed: {
    opacity: 0.7,
  },
  cancelButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  cancel: {
    color: BRAND_COLOR(c),
    fontSize: 16,
  },
});
