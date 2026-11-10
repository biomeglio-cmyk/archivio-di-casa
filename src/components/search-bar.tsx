import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View, type TextInputInstance } from 'react-native';

import { BRAND_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

// iOS-style search field: magnifying glass, clear button, and "Annulla" while active,
// which empties the field and closes the keyboard
export function SearchBar({ value, onChangeText, placeholder }: Props) {
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

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        style={[styles.field, { backgroundColor: theme.backgroundElement }]}>
        <SymbolView name="magnifyingglass" tintColor={theme.textSecondary} size={16} />
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
          style={[styles.input, { color: theme.text }]}
        />
        {value.length > 0 && (
          <Pressable onPress={() => onChangeText('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancella testo">
            <SymbolView name="xmark.circle.fill" tintColor={theme.textSecondary} size={16} />
          </Pressable>
        )}
      </Pressable>
      {active && (
        <Pressable onPress={cancel} hitSlop={8} accessibilityRole="button">
          <Text style={styles.cancel}>Annulla</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderCurve: 'continuous',
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: 8,
  },
  cancel: {
    color: BRAND_COLOR,
    fontSize: 17,
  },
});
