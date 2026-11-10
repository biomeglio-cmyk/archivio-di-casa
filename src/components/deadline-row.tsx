import { router, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { BRAND_COLOR, DANGER_COLOR } from '@/constants/brand';
import type { DocumentListItem } from '@/db/types';
import { usePressed } from '@/hooks/use-pressed';
import { useTheme } from '@/hooks/use-theme';
import { describeDistance, formatShortDate } from '@/utils/dates';
import { daysUntil } from '@/utils/deadlines';

type Props = {
  document: DocumentListItem; // includes category and person name
  href: Href;
  highlighted?: boolean; // its day is selected in the week strip
};

// One deadline: category icon on a rounded square, "Title · Person", and
// "gio 12 nov · tra 2 giorni" (red "scaduto da N giorni" when overdue). Nothing is truncated:
// with large Dynamic Type the lines wrap and the row grows.
export function DeadlineRow({ document, href, highlighted = false }: Props) {
  const theme = useTheme();
  const { pressed, handlers } = usePressed();
  const { category } = document;
  const days = document.expiresAt ? daysUntil(document.expiresAt) : null;
  const overdue = days !== null && days < 0;

  const background = pressed ? theme.backgroundSelected : highlighted ? `${BRAND_COLOR}1F` : theme.backgroundElement;

  return (
    <Pressable
      {...handlers}
      onPress={() => router.push(href)}
      accessibilityRole="button"
      style={[styles.row, { backgroundColor: background }, highlighted && { borderColor: BRAND_COLOR }]}>
      <View style={[styles.icon, { backgroundColor: category.colors.bottom }]}>
        <SymbolView name={category.symbol} tintColor={category.colors.text} size={20} />
      </View>
      <View style={styles.texts}>
        <ThemedText>
          {document.title}
          {document.personName ? <ThemedText themeColor="textSecondary"> · {document.personName}</ThemedText> : null}
        </ThemedText>
        {document.expiresAt && days !== null && (
          <ThemedText type="small" themeColor="textSecondary" style={overdue && { color: DANGER_COLOR }}>
            {formatShortDate(document.expiresAt)} · {describeDistance(days)}
          </ThemedText>
        )}
      </View>
      <SymbolView name="chevron.right" tintColor={theme.textSecondary} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1.5,
    borderColor: 'transparent', // becomes the brand color when highlighted
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderCurve: 'continuous',
    alignItems: 'center',
    justifyContent: 'center',
  },
  texts: {
    flex: 1,
    gap: 2,
  },
});
