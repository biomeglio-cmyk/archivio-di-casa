import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import { Text } from '@/components/text';
import { Colors } from '@/constants/theme';
import { FONTS } from '@/constants/typography';

type Props = {
  title: string; // "Cancellare la categoria Bollette?"
  message: string;
  confirmLabel: string; // red button
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  symbol?: SFSymbol; // in the soft red circle; trash by default
  children?: ReactNode; // e.g. the choices of "Cancella categoria"
};

// Delete confirmation of the design (CancellaCategoria / CancellaDocumento): dimmed page, a white
// dialog with 30pt corners, the trash in a soft red circle, title 21/700, the explanation, a full
// red button and "Annulla" on lilac. Used by transparent routes, which give the dim background.
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  symbol = 'trash',
  children,
}: Props) {
  return (
    <Animated.View entering={FadeIn.duration(160)} style={styles.dim}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Annulla"
      />
      <Animated.View
        entering={ZoomIn.duration(180)}
        style={styles.dialog}
        accessibilityViewIsModal
        accessibilityRole="alert"
        onAccessibilityEscape={onCancel}>
        <View style={styles.icon}>
          <SymbolView name={symbol} tintColor={Colors.current.error} size={26} />
        </View>
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
        {children}
        <Pressable
          onPress={onConfirm}
          disabled={busy}
          accessibilityRole="button"
          style={({ pressed }) => [styles.confirm, (pressed || busy) && styles.pressed]}>
          <Text style={styles.confirmLabel}>{confirmLabel}</Text>
        </Pressable>
        <Pressable
          onPress={onCancel}
          accessibilityRole="button"
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}>
          <Text style={styles.cancelLabel}>Annulla</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

type ChoiceProps = {
  label: string;
  detail: string;
  checked: boolean;
  onPress: () => void;
};

// One radio choice inside the dialog ("Spostali in Altro" / "Cancellali")
export function ConfirmChoice({ label, detail, checked, onPress }: ChoiceProps) {
  const accent = '#6D5CE6';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked }}
      accessibilityLabel={`${label}. ${detail}`}
      style={[
        styles.choice,
        {
          borderColor: checked ? accent : 'transparent',
          backgroundColor: checked ? Colors.current.paleLilac : Colors.current.elevated,
        },
      ]}>
      <View style={[styles.ring, { borderColor: checked ? accent : Colors.current.dashed }]}>
        {checked && <View style={[styles.dot, { backgroundColor: accent }]} />}
      </View>
      <View style={styles.choiceTexts}>
        <Text style={styles.choiceLabel}>{label}</Text>
        <Text style={styles.choiceDetail}>{detail}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  dim: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: 'rgba(28, 30, 70, 0.42)',
  },
  dialog: {
    alignItems: 'center',
    paddingTop: 26,
    paddingHorizontal: 22,
    paddingBottom: 20,
    borderRadius: 30,
    borderCurve: 'continuous',
    backgroundColor: Colors.current.surface,
    boxShadow: '0 20px 50px rgba(28, 30, 70, 0.25)',
  },
  icon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.current.errorBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    fontSize: 21,
    lineHeight: 27,
    fontFamily: FONTS.bold,
    textAlign: 'center',
    color: Colors.current.text,
  },
  message: {
    marginTop: 8,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    color: Colors.current.textOnLilac,
  },
  confirm: {
    marginTop: 18,
    alignSelf: 'stretch',
    minHeight: 54,
    borderRadius: 27,
    backgroundColor: Colors.current.destructive,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 18px rgba(217, 45, 32, 0.25)',
  },
  confirmLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  cancel: {
    marginTop: 8,
    alignSelf: 'stretch',
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: Colors.current.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    color: Colors.current.text,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  pressed: {
    opacity: 0.75,
  },
  choice: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderRadius: 18,
    borderCurve: 'continuous',
  },
  ring: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  choiceTexts: {
    flex: 1,
  },
  choiceLabel: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: Colors.current.text,
  },
  choiceDetail: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: Colors.current.textSecondary,
  },
});
