import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { chooseAction } from '@/utils/action-sheet';

import { FitLine } from '@/components/fit-line';
import { ThemedText } from '@/components/themed-text';
import { WhiteCard } from '@/components/white-card';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import { type Palette, Spacing } from '@/constants/theme';
import { useTheme, useThemedStyles } from '@/hooks/use-theme';

const PADDING = 16; // inside the card, left and right
const ICON = 22; // width of the icon column
const GAP = 14; // between the icon and the text

// A section of rows (Menu, settings screens): grey uppercase title, a white card of rows with
// separators inset after the icon, an optional footer.
export function Group({ title, footer, children }: { title?: string; footer?: string; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.group}>
      {title && (
        <ThemedText type="small" themeColor="textSecondary" style={styles.groupTitle} accessibilityRole="header">
          {title}
        </ThemedText>
      )}
      <WhiteCard style={styles.card}>{children}</WhiteCard>
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
export function Row({
  label,
  symbol,
  value,
  count,
  alert = false,
  first = false,
  disabled = false,
  onPress,
  children,
}: RowProps) {
  const styles = useThemedStyles(makeStyles);
  const theme = useTheme();
  const content = (
    <>
      <View style={styles.icon}>
        <SymbolView name={symbol} tintColor={disabled ? theme.textSecondary : BRAND_COLOR(theme)} size={20} />
      </View>
      {/* The separator is the top line of this part, so it starts after the icon */}
      <View
        style={[styles.body, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.separator }]}>
        {/* Label and value on one line when they fit, else the value under the label (measured) */}
        <FitLine
          start={<ThemedText style={disabled ? { color: theme.textSecondary } : undefined}>{label}</ThemedText>}
          end={
            <View style={styles.end}>
              {value !== undefined && (
                <ThemedText themeColor="textSecondary" style={styles.value}>
                  {value}
                </ThemedText>
              )}
              {count !== undefined && (
                <ThemedText
                  themeColor="textSecondary"
                  style={[styles.value, alert && count > 0 && { color: DANGER_COLOR(theme), fontWeight: 600 }]}>
                  {String(count)}
                </ThemedText>
              )}
              {children}
              {onPress && !disabled && <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />}
            </View>
          }
        />
      </View>
    </>
  );
  const style = styles.row;

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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  group: {
    gap: Spacing.titleToContent,
  },
  groupTitle: {
    paddingHorizontal: 4,
    fontSize: 13,
    fontWeight: 400,
    textTransform: 'uppercase', // +0.1em letter spacing from the app Text
  },
  card: {
    paddingVertical: 4,
  },
  footer: {
    paddingHorizontal: 4,
    marginTop: -4, // closer to its card than the title gap
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: PADDING,
  },
  icon: {
    width: ICON,
    marginRight: GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingVertical: 10,
    paddingRight: PADDING,
  },
  end: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  value: {
    flexShrink: 1,
  },
  choiceText: {
    flexShrink: 1,
    color: BRAND_COLOR(c),
  },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
});

type ChoiceProps<T> = {
  title: string; // of the iOS menu ("Promemoria")
  value: T;
  options: T[];
  labelFor: (option: T) => string; // what the row shows
  menuLabelFor?: (option: T) => string; // what the menu shows (e.g. with "(predefinito)")
  onChange: (option: T) => void;
};

// The value of a row that opens a choice: our own text (complete, never cut by a native button)
// with the iOS chevrons; a tap opens the native menu of the options
export function Choice<T>({ title, value, options, labelFor, menuLabelFor = labelFor, onChange }: ChoiceProps<T>) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  async function open() {
    const index = await chooseAction(title, options.map(menuLabelFor));
    if (index !== null) onChange(options[index]);
  }
  const label = labelFor(value);
  return (
    <Pressable
      onPress={open}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${label}`}
      hitSlop={8}
      style={({ pressed }) => [styles.choice, pressed && { opacity: 0.6 }]}>
      <ThemedText style={styles.choiceText}>{label}</ThemedText>
      <SymbolView name="chevron.up.chevron.down" tintColor={BRAND_COLOR(theme)} size={13} weight="semibold" />
    </Pressable>
  );
}
