import type { ReactNode } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';

import { TextInput } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { type Palette } from '@/constants/theme';

type FormFieldProps = {
  label: string;
  required?: boolean; // shows a brand-colored asterisk after the label
  children: ReactNode;
};

// "Titolo *": the asterisk marks a required field (explained by a note under the form)
export function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <ThemedText>
      {label}
      {required && <ThemedText style={styles.asterisk}> *</ThemedText>}
    </ThemedText>
  );
}

// Small label above a form control
export function FormField({ label, required = false, children }: FormFieldProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        {label}
        {required && <ThemedText type="smallBold" style={styles.asterisk}> *</ThemedText>}
      </ThemedText>
      {children}
    </View>
  );
}

// Text input styled like the other rows of the app
export function TextField(props: TextInputProps) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();

  return (
    <TextInput
      placeholderTextColor={theme.placeholder}
      {...props}
      style={[styles.input, { backgroundColor: theme.lilac, color: theme.text }, props.style]}
    />
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  field: {
    gap: 6,
  },
  label: {
    paddingHorizontal: 4,
  },
  asterisk: {
    color: BRAND_COLOR(c),
  },
  input: {
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderCurve: 'continuous',
  },
});
