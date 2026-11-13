import type { ReactNode } from 'react';
import { StyleSheet, View, type TextInputProps } from 'react-native';

import { TextInput } from '@/components/text';
import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR } from '@/constants/brand';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';
import { type Palette } from '@/constants/theme';
import { useI18n } from '@/i18n';

type FormFieldProps = {
  label: string;
  required?: boolean; // shows a brand-colored asterisk after the label
  children: ReactNode;
  // The control below already says the label (its accessibilityLabel): VoiceOver skips this one
  labelHiddenFromAccessibility?: boolean;
};

// VoiceOver: "Titolo, obbligatorio" instead of "Titolo asterisco"
function useSpokenLabel(label: string, required: boolean): string {
  const { t } = useI18n();
  return required ? `${label}, ${t('a11y.formField.required')}` : label;
}

// "Titolo *": the asterisk marks a required field (explained by a note under the form)
export function FieldLabel({ label, required = false }: { label: string; required?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const spoken = useSpokenLabel(label, required);
  return (
    <ThemedText accessibilityLabel={spoken}>
      {label}
      {required && <ThemedText style={styles.asterisk}> *</ThemedText>}
    </ThemedText>
  );
}

// Small label above a form control
export function FormField({ label, required = false, children, labelHiddenFromAccessibility = false }: FormFieldProps) {
  const styles = useThemedStyles(makeStyles);
  const spoken = useSpokenLabel(label, required);
  return (
    <View style={styles.field}>
      <ThemedText
        type="smallBold"
        themeColor="textSecondary"
        style={styles.label}
        accessibilityLabel={spoken}
        accessibilityElementsHidden={labelHiddenFromAccessibility}
        importantForAccessibility={labelHiddenFromAccessibility ? 'no-hide-descendants' : 'auto'}>
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
