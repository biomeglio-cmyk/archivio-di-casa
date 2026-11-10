import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { useTheme } from '@/hooks/use-theme';

// iOS grouped list (like the Settings app), used by the Menu and the settings screens:
// a grey uppercase title, a rounded card of rows, an optional footer.
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.group}>
      {title && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.groupTitle} accessibilityRole="header">
          {title.toUpperCase()}
        </ThemedText>
      )}
      <View style={[styles.card, { backgroundColor: theme.surface }]}>{children}</View>
      {footer && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
          {footer}
        </ThemedText>
      )}
    </View>
  );
}

type RowProps = {
  label: string;
  symbol: SFSymbol;
  value?: string; // grey text on the right (e.g. "presto", the chosen calendar)
  count?: number; // number on the right (e.g. how many documents)
  alert?: boolean; // the count in red (overdue or expiring deadlines)
  first?: boolean; // first row of its group: no separator line above
  disabled?: boolean; // greyed, not tappable
  onPress?: () => void; // tappable row with a chevron
  children?: ReactNode; // native control on the right (Switch, Picker…)
};

// One row: icon, label (wraps with large text), then a value or count, a control, or a chevron
export function Row({ label, symbol, value, count, alert = false, first = false, disabled = false, onPress, children }: RowProps) {
  const theme = useTheme();
  const content = (
    <>
      <SymbolView name={symbol} tintColor={disabled ? theme.textSecondary : BRAND_COLOR} size={20} />
      <ThemedText style={[styles.label, disabled && { color: theme.textSecondary }]}>{label}</ThemedText>
      {value !== undefined && (
        <ThemedText themeColor="textSecondary" style={styles.value}>
          {value}
        </ThemedText>
      )}
      {count !== undefined && (
        <ThemedText
          themeColor="textSecondary"
          style={[styles.value, alert && count > 0 && { color: DANGER_COLOR, fontWeight: 600 }]}>
          {String(count)}
        </ThemedText>
      )}
      {children}
      {onPress && !disabled && <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />}
    </>
  );
  const style = [
    styles.row,
    !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.backgroundSelected },
  ];

  return onPress && !disabled ? (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={count !== undefined ? `${label}, ${count}` : undefined}
      style={({ pressed }) => [style, pressed && { opacity: 0.6 }]}>
      {content}
    </Pressable>
  ) : (
    <View style={style} accessibilityState={{ disabled }}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: 6,
  },
  groupTitle: {
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: 12,
    borderCurve: 'continuous',
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingVertical: 10,
  },
  label: {
    flex: 1,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
